import { AsyncLocalStorage } from 'node:async_hooks'

import {
  type AutocompleteInteraction,
  type BaseInteraction,
  Client,
  type ClientOptions,
} from 'discord.js'
import { EventEmitter } from 'tseep'

import { PreRunError } from './errors/PreRunError.ts'
import { SleetCommand } from './modules/base/SleetCommand.ts'
import { SleetModule } from './modules/base/SleetModule.ts'
import { SleetMessageCommand } from './modules/context-menu/SleetMessageCommand.ts'
import { SleetUserCommand } from './modules/context-menu/SleetUserCommand.ts'
import {
  type ApplicationInteraction,
  type BaseSleetModuleEventHandlers,
  type EventArguments,
  type EventDetails,
  isDiscordEvent,
  isSleetEvent,
  isSpecialEvent,
  type SleetContext,
  type SleetModuleEventHandlers,
} from './modules/events.ts'
import { SleetSlashCommand } from './modules/slash/SleetSlashCommand.ts'
import { SleetRest } from './SleetRest.ts'

/**
 * Middleware for the module event handling. Can be used like express middleware to wrap around event handling logic to add logging, error catching, conditional handling, etc.
 *
 * See the `middleware` option in {@link SleetOptions} for more details and examples on how to use this.
 * @param module The module being run
 * @param callback The callback to run the event handler on the module
 * @param event The event being handled
 * @returns The result of the callback being run
 */
export type SleetModuleMiddleware = (
  module: SleetModule,
  event: EventDetails,
  next: () => Promise<unknown>,
) => Promise<unknown>

/**
 * Sleet-specific options
 */
export interface SleetOptions {
  /** The bot's token */
  token: string
  /** The bot's application ID */
  applicationId: string
  /**
   * Middleware for the module event handling. Can be used like express middleware to wrap around event handling logic to add logging, error catching, conditional handling, etc.
   *
   * Runners are run sequentially in the order they are provided, and each runner wraps around the previous one, so the first runner in the array is the outermost wrapper, and the last runner is the innermost wrapper (closest to the actual event handler).
   *
   * If you don't call `next()`, the event will NOT be handled
   *
   * You should follow these rules:
   *   - No events or following module runners will be handled if you don't call `next()`. You can use this for conditional event handling
   *     - Note that this includes all events, including interactions being routed to commands which will end up timing out if not handled
   *     - The order of module runners is important, for example if you have [filtering, logging, error-catching], logging and error-catching will not run if filtering did not call `next()`.
   *
   * For most cases, you will use something like the following:
   * @example
   * async function addTrace(module, event, next) {
   *   const span = tracer.startSpan(`module:${module.name}:${event.name}`)
   *
   *   try {
   *     await next()
   *   } finally {
   *     span.finish()
   *   }
   * }
   */
  middleware?: SleetModuleMiddleware[]
}

export interface SleetClientOptions {
  /**
   * Options specific to and provided to SleetClient
   */
  sleet: SleetOptions
  /**
   * Options specific to and provided to the Discord.js client
   * @see https://discordjs.dev/docs/packages/discord.js/14.26.2/ClientOptions:Interface
   */
  client: ClientOptions
}

export interface PutCommandOptions {
  /** The commands to PUT, if any (defaults to added commands) */
  commands?: SleetCommand[]
  /** The guild to PUT to, if any */
  guildId?: string
  /** Override the `guilds` ID lock on commands. Warning, this may publish commands you don't want published */
  overrideGuildCheck?: boolean
  /** Registers "guild-restricted" commands (via `registerOnlyInGuilds`) in the specified guilds. Note, this will do several HTTP requests at once, based on the number of guilds specified (once per each guild ID) */
  registerGuildRestrictedCommands?: boolean
}

type SleetModuleEventKey = keyof SleetModuleEventHandlers
type SleetModuleEventRegistration = [
  SleetModuleEventKey,
  SleetModuleEventHandlers[SleetModuleEventKey],
]

function isSleetCommand(value: unknown): value is SleetCommand {
  return value instanceof SleetCommand
}

/**
 * A command handler built around Discord.js, the SleetClient handles passing
 * interactions to commands and registering them
 */
export class SleetClient<Ready extends boolean = boolean> extends EventEmitter<
  Required<BaseSleetModuleEventHandlers>
> {
  options: SleetOptions
  /**
   * The Discord.js client used for interacting with the Discord API and receiving events.
   */
  client: Client<Ready>
  /**
   * The SleetRest instance used for registering commands with Discord.
   */
  rest: SleetRest
  /**
   * Map of module name to SleetModule, used for routing incoming events to the right module handlers. Note that modules are namespaced based on their parent modules, so child modules will be registered under `parent/child` to avoid conflicts between "different parent name, same child name" modules.
   */
  modules: Map<string, SleetModule> = new Map()
  /**
   * Map of command name to SleetCommand module, used for routing incoming interactions to the right command module. Note that this is not namespaced like the `modules` map, so command modules with the same name will overwrite each other (and cause unexpected behavior), so make sure to give your command modules unique names.
   */
  commands: Map<string, SleetCommand> = new Map()
  /**
   * Map of registered events for each module, used for unregistering events when a module is removed. Maps the module to an array of tuples of the event name and the event handler function.
   */
  registeredEvents: Map<SleetModule, SleetModuleEventRegistration[]> = new Map()
  /**
   * The context passed to module event handlers, containing the SleetClient and the Discord.js client.
   */
  context: SleetContext
  /**
   * The middleware stack for module event handling. See {@link SleetModuleMiddleware} for more details on how to use this.
   */
  middleware: SleetModuleMiddleware[]
  /**
   * "Compiled" middleware runner, to avoid composing the middleware on every event
   */
  #compiledModuleRunner: SleetModuleMiddleware | null = null
  /**
   * AsyncLocalStorage for the currently running module, in this current async context
   */
  runningModuleStore: AsyncLocalStorage<SleetModule> = new AsyncLocalStorage()

  get #moduleRunner() {
    if (!this.#compiledModuleRunner) {
      this.#compiledModuleRunner = this.#composeMiddleware(this.middleware)
    }

    return this.#compiledModuleRunner
  }

  constructor(options: SleetClientOptions) {
    super()
    this.options = options.sleet
    this.middleware = options.sleet.middleware ?? []

    this.client = new Client(options.client)

    this.rest = new SleetRest({
      token: options.sleet.token,
      applicationId: options.sleet.applicationId,
    })

    this.context = {
      sleet: this,
      client: this.client,
    }

    this.client.on('interactionCreate', this.#interactionCreate.bind(this))
  }

  /**
   * Adds a set of modules to Sleet, which will handle incoming events using their handlers.
   *
   * Modules are keyed by their name, so identically named modules will overwrite each other
   *
   * {@link SleetCommand} is a special module that can also handle incoming interactions, and will be routed automatically by Sleet.
   *
   * Will also recursively add any child modules, namespacing them (`parent/child`) to avoid conflicts between "different parent name, same child name" modules.
   *
   * You *can* add a child module individually, but you might end up with the same module loaded multiple
   * because of Sleet's auto namespacing (if you load the child individually and the parent of that child).
   *
   * @param modules The modules to add
   * @returns This SleetClient for chaining
   */
  addModules(modules: SleetModule[], namePrefix = ''): this {
    for (const module of modules) {
      const qualifiedName = `${namePrefix}${module.name}`
      this.#registerEventsFor(module)
      this.modules.set(qualifiedName, module)

      if (isSleetCommand(module)) {
        if (this.commands.has(module.name)) {
          this.emit('sleetWarn', 'Overwriting existing module', module)
        }

        this.commands.set(module.name, module)
      }

      for (const middleware of module.middleware ?? []) {
        this.addMiddleware(middleware)
      }

      for (const child of module.modules) {
        this.addModules([child], `${qualifiedName}/`)
      }

      void (async () => {
        try {
          await module.handlers.load?.call(this.context)
          this.emit('loadModule', module, qualifiedName)
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e))
          this.emit('sleetError', `Module ${module.name} failed to load`, err)
        }
      })()
    }

    return this
  }

  /**
   * Removes a set of modules from Sleet, they will no longer handle incoming
   * events/interactions
   *
   * Will also remove any child modules. You *cannot* remove a child module individually
   * (while keeping the parent) without also specifying the proper `namePrefix` (normally `parent/` to result in `parent/child`).
   * @param modules The modules to remove
   * @returns This SleetClient for chaining
   */
  removeModules(modules: SleetModule[], namePrefix = ''): this {
    for (const module of modules) {
      const qualifiedName = `${namePrefix}${module.name}`
      this.#unregisterEventsFor(module)
      this.modules.delete(qualifiedName)

      if (isSleetCommand(module)) {
        this.commands.delete(module.name)
      }

      for (const middleware of module.middleware ?? []) {
        this.removeMiddleware(middleware)
      }

      for (const child of module.modules) {
        this.removeModules([child], `${qualifiedName}/`)
      }

      void (async () => {
        try {
          await module.handlers.unload?.call(this.context)
          this.emit('unloadModule', module, qualifiedName)
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e))
          this.emit('sleetError', `Module ${module.name} failed to unload`, err)
        }
      })()
    }

    return this
  }

  #registerEventsFor(module: SleetModule) {
    if (!(module instanceof SleetModule)) {
      throw new Error(`${String(module)} is not a SleetModule, but was being registered for events`)
    }

    const events = this.registeredEvents.get(module) ?? []

    for (const [event, handler] of Object.entries(module.handlers) as [
      keyof SleetModuleEventHandlers,
      SleetModuleEventHandlers[keyof SleetModuleEventHandlers],
    ][]) {
      if (!handler) continue

      this.emit('sleetDebug', `Registering event '${event}' for '${module.name}'`)

      const boundEvent = handler.bind(this.context)
      // For tseep to properly handle the event, we need to know how many arguments it takes
      // since tseep does optimization based on the number of arguments
      // but because we wrap the event handler (to add the module context), tseep can't automatically
      // determine the number of arguments
      const argsNum = handler.length

      // Since we have many different types of handlers taking many different types of arguments, and
      // no real use in handling type errors here (since we don't know which events are called until
      // runtime and TS doesn't do runtime validation), we opt-out of compile-time validation here
      // by just throwing unknowns everywhere until typescript says its okay
      const eventHandler = async (...args: EventArguments) => {
        const eventDetails: EventDetails = {
          name: event as any,
          arguments: args as any,
        }

        // Conditional since we don't want to emit eventHandled for eventHandled
        // This causes a cool call stack size exceeded
        if (event !== 'eventHandled') {
          this.emit('eventHandled', eventDetails, module)
        }

        await this.#runWithMiddleware(module, eventDetails, () =>
          this.runningModuleStore.run<Promise<unknown>, unknown[]>(
            module,
            boundEvent as any,
            ...args,
          ),
        )
      }

      if (isDiscordEvent(event)) {
        this.client.on(event, eventHandler as any)
      } else if (isSleetEvent(event)) {
        this.addListener(event, eventHandler as any, argsNum as any)
      } else if (!isSpecialEvent(event)) {
        const strEvent = String(event)

        throw new Error(
          `Unknown event '${strEvent}' while processing ${module.name}${strEvent === 'ready' ? ": 'ready' is deprecated, use 'clientReady' instead" : ''}`,
        )
      }

      events.push([event, eventHandler])
    }

    this.registeredEvents.set(module, events)
  }

  #unregisterEventsFor(module: SleetModule) {
    if (!(module instanceof SleetModule)) {
      throw new Error(
        `${String(module)} is not a SleetModule, but was being unregistered for events`,
      )
    }

    const events = this.registeredEvents.get(module)
    if (!events) return

    for (const [event, eventHandler] of events) {
      if (!eventHandler) continue

      if (isDiscordEvent(event)) {
        this.client.off(event, eventHandler as any)
      } else if (isSleetEvent(event)) {
        this.off(event, eventHandler as any)
      } else if (!isSpecialEvent(event)) {
        throw new Error(`Unknown event '${String(event)}' while processing ${module.name}`)
      }
    }

    this.registeredEvents.delete(module)
  }

  /**
   * PUTs a set of commands, registering them with discord
   *
   * This **WILL** overwrite ALL commands, either globally (guildId undefined)
   * or for a specific guild (guildId defined)
   *
   * Use this **only** when you want to fully sync all commands
   * @param options Options for the PUT
   * @returns The response from Discord
   */
  async putCommands(options: PutCommandOptions = {}): Promise<unknown> {
    const {
      commands,
      guildId,
      overrideGuildCheck = false,
      registerGuildRestrictedCommands,
    } = options

    const sleetCommands = commands ?? Array.from(this.commands.values())

    let toAdd: SleetCommand[]

    if (overrideGuildCheck) {
      toAdd = sleetCommands
    } else if (guildId) {
      toAdd = sleetCommands.filter(
        (c) => !c.registerOnlyInGuilds || c.registerOnlyInGuilds.includes(guildId),
      )
    } else {
      toAdd = sleetCommands.filter((c) => !c.registerOnlyInGuilds)
    }

    const promises: Promise<unknown>[] = []

    if (registerGuildRestrictedCommands) {
      // Map<guildId, commands>
      const toRegister = new Map<string, SleetCommand[]>()

      for (const command of sleetCommands) {
        if (!command.registerOnlyInGuilds) continue

        for (const cGuildId of command.registerOnlyInGuilds) {
          const guildCommand = toRegister.get(cGuildId) ?? []
          guildCommand.push(command)
          toRegister.set(cGuildId, guildCommand)
        }
      }

      for (const [registerGuildId, registerCommand] of toRegister) {
        promises.push(this.putCommands({ commands: registerCommand, guildId: registerGuildId }))
      }
    }

    this.emit(
      'sleetDebug',
      `Putting commands (${
        guildId ? `in ${guildId}` : 'globally'
      }) to api: ${toAdd.map((c) => c.name).join(', ')}`,
    )
    const body = toAdd.map((command) => command.body)

    if (guildId) {
      promises.push(this.rest.putGuildCommands(body, guildId))
    } else {
      promises.push(this.rest.putCommands(body))
    }

    return Promise.all(promises)
  }

  /**
   * Starts the login process to Discord, you should register all commands
   * *before* logging in
   * @returns The token used to login if successful
   */
  login(): Promise<string> {
    this.client.once('clientReady', () => void this.client.application?.fetch())
    return this.client.login(this.options.token)
  }

  /**
   * Handles an incoming interaction, matching it with a registered command
   * @param interaction The interaction to handle
   * @returns Nothing
   */
  async #interactionCreate(interaction: BaseInteraction): Promise<void> {
    if (interaction.isAutocomplete()) {
      return this.#handleAutocompleteInteraction(interaction)
    }

    if (
      interaction.isChatInputCommand() ||
      interaction.isMessageContextMenuCommand() ||
      interaction.isUserContextMenuCommand()
    ) {
      return this.#handleApplicationInteraction(interaction)
    }
  }

  async #handleApplicationInteraction(interaction: ApplicationInteraction) {
    const module = this.commands.get(interaction.commandName)

    if (!module) {
      this.emit('sleetWarn', 'No module registered for this interaction', interaction)
      return
    }

    if (!(module instanceof SleetCommand)) {
      this.emit(
        'sleetWarn',
        `${String(module)} is not a SleetCommand, but has registered interactions`,
        interaction.commandName,
      )
      return
    }

    const eventDetails: EventDetails = {
      name: 'interactionCreate',
      arguments: [interaction],
    }

    await this.#runWithMiddleware(module, eventDetails, () =>
      this.runningModuleStore.run(module, async () => {
        this.emit('runModule', module, interaction)

        try {
          // Make sure the module can run the incoming type of interaction
          if (interaction.isChatInputCommand() && module instanceof SleetSlashCommand) {
            await module.run(this.context, interaction)
          } else if (interaction.isUserContextMenuCommand() && module instanceof SleetUserCommand) {
            await module.run(this.context, interaction)
          } else if (
            interaction.isMessageContextMenuCommand() &&
            module instanceof SleetMessageCommand
          ) {
            await module.run(this.context, interaction)
          } else {
            this.emit('sleetWarn', 'Module could not handle incoming interaction', interaction)
          }
        } catch (e) {
          await this.#handleApplicationInteractionError(interaction, module, e)
        }
      }),
    )
  }

  async #handleAutocompleteInteraction(interaction: AutocompleteInteraction) {
    const module = this.commands.get(interaction.commandName)

    if (!module) {
      this.emit('sleetWarn', 'No module registered for this interaction', interaction)
      await interaction.respond([
        {
          name: 'No module registered for this interaction',
          value: 'ERROR',
        },
      ])
      return
    }

    if (!(module instanceof SleetCommand)) {
      this.emit(
        'sleetWarn',
        `${String(module)} is not a SleetCommand, but has registered interactions`,
        interaction.commandName,
      )
      await interaction.respond([
        {
          name: 'Wrong module type for this interaction',
          value: 'ERROR',
        },
      ])
      return
    }

    const eventDetails: EventDetails = {
      name: 'interactionCreate',
      arguments: [interaction],
    }

    await this.#runWithMiddleware(module, eventDetails, () =>
      this.runningModuleStore.run(module, async () => {
        try {
          if (module instanceof SleetSlashCommand) {
            await module.autocomplete(this.context, interaction)
          }
        } catch (e) {
          await this.#handleAutocompleteInteractionError(interaction, module, e)
        }
      }),
    )
  }

  async #handleAutocompleteInteractionError(
    interaction: AutocompleteInteraction,
    module: SleetModule,
    error: unknown,
  ) {
    this.emit('autocompleteInteractionError', module, interaction, error)

    const response = [
      {
        name: `An error occurred while handling autocomplete for ${module.name}`,
        value: 'ERROR',
      },
    ]

    if (!interaction.responded) {
      try {
        await interaction.respond(response)
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        this.emit('sleetError', 'Error while handling autocomplete error', err)
      }
    }
  }

  async #handleApplicationInteractionError(
    interaction: ApplicationInteraction,
    module: SleetModule,
    error: unknown,
  ) {
    try {
      if (error instanceof PreRunError) {
        const content = `:warning: ${error.message}`
        await conditionalReply(interaction, content)
      } else {
        this.emit('applicationInteractionError', module, interaction, error)
        const content = `:warning: An unexpected error occurred while running this command, please try again later.\n${String(
          error,
        )}`
        await conditionalReply(interaction, content)
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      this.emit('sleetError', 'Error while handling interaction error', err)
    }
  }

  #composeMiddleware(middleware: SleetModuleMiddleware[]): SleetModuleMiddleware {
    return function (module, event, final) {
      let index = -1

      function dispatch(i: number): Promise<unknown> {
        if (i <= index) {
          return Promise.reject(new Error('next() called multiple times'))
        }

        index = i
        let fn = i === middleware.length ? final : middleware[i]

        if (!fn) {
          return Promise.resolve()
        }

        try {
          return Promise.resolve(fn(module, event, () => dispatch(i + 1)))
        } catch (err) {
          return Promise.reject(err)
        }
      }

      return dispatch(0)
    }
  }

  /**
   * Runs any middleware and then finally the event handler callback for a given module and event
   *
   * @param module The module being run
   * @param event The event being handled
   * @param callback The callback to run the event handler on the module
   * @returns The result of the callback being run, after all middleware has been processed
   */
  async #runWithMiddleware(
    module: SleetModule,
    event: EventDetails,
    callback: () => Promise<unknown>,
  ): Promise<unknown> {
    return this.#moduleRunner(module, event, callback)
  }

  /**
   * Adds a middleware to the module event handling. Can be used like express middleware to wrap around event handling logic to add logging, error catching, conditional handling, etc.
   *
   * Added middleware runs after all previously added middleware.
   *
   * See the `middleware` option in {@link SleetOptions} for more details and examples on how to use this.
   * @param middleware The middleware to add
   * @returns Nothing
   */
  addMiddleware(middleware: SleetModuleMiddleware): void {
    this.middleware.push(middleware)
    this.#compiledModuleRunner = null
  }

  /**
   * Removes a middleware from the module event handling.
   *
   * Note that this will only remove the first instance of the middleware, if the same middleware is added multiple times, you will need to call this multiple times to remove all instances.
   * @param middleware The middleware to remove
   * @returns Nothing
   */
  removeMiddleware(middleware: SleetModuleMiddleware): void {
    const index = this.middleware.indexOf(middleware)
    if (index !== -1) {
      this.middleware.splice(index, 1)
      this.#compiledModuleRunner = null
    }
  }
}

async function conditionalReply(interaction: ApplicationInteraction, content: string) {
  // TODO: if you do
  // const defer = interaction.deferReply()
  // [error here!!]
  // await defer
  // The interaction can be in the middle of being deferred _but_ d.js doesn't mark it as deferred
  // until the request is done (response from discord),
  // leading to deferred = false -> reply attempt -> race condition -> error already replied
  // Possible solutions:
  //  - Listen to apiRequest/apiResponse, mark as "awaiting defer"/"deferred"
  //  - try catch wait

  if (interaction.deferred) {
    try {
      await interaction.editReply(content)
    } catch {
      // Wait a second for the deferral
      setTimeout(() => {
        void interaction.editReply(content)
      }, 1000)
    }
  } else {
    void interaction.reply({
      content,
      ephemeral: true,
    })
  }
}
