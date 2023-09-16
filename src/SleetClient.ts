import {
  ApplicationCommandType,
  AutocompleteInteraction,
  Awaitable,
  Client,
  ClientOptions,
  Interaction,
  InteractionType,
} from 'discord.js'
import { SleetRest } from './SleetRest.js'
import { PreRunError } from './errors/PreRunError.js'
import { SleetCommand } from './modules/base/SleetCommand.js'
import { SleetModule } from './modules/base/SleetModule.js'
import { SleetSlashCommand } from './modules/slash/SleetSlashCommand.js'
import { SleetUserCommand } from './modules/context-menu/SleetUserCommand.js'
import { SleetMessageCommand } from './modules/context-menu/SleetMessageCommand.js'
import {
  ApplicationInteraction,
  BaseSleetModuleEventHandlers,
  EventArguments,
  EventDetails,
  isDiscordEvent,
  isSleetEvent,
  isSpecialEvent,
  ShouldSkipEventReturn,
  SleetContext,
  SleetExtensions,
  SleetModuleEventHandlers,
} from './modules/events.js'
import { EventEmitter } from 'tseep'
import { AsyncLocalStorage } from 'async_hooks'

type ModuleRunner<R = unknown> = (
  module: SleetModule,
  callback: (...args: unknown[]) => Awaitable<R>,
  event: EventDetails,
) => Awaitable<R>

const defaultModuleRunner: ModuleRunner = (_module, callback, event) =>
  callback(...event.arguments)

/**
 * Sleet-specific options
 */
interface SleetOptions {
  /** The bot's token */
  token: string
  /** The bot's application ID */
  applicationId: string
  /**
   * Use a custom runner to wrap around all module event runs, useful for adding tracing via transactions or spans
   *
   * If you don't call the `callback`, the module will NOT run, the required arguments to the `callback` are in the `event` object as `event.arguments`
   *
   * For most cases, you will use something like the following:
   * @example
   * function moduleRunner(module, callback, event) {
   *   const span = tracer.startSpan(`module.${module.name}.${event.name}`)
   *
   *   try {
   *     return callback(...event.arguments)
   *   } finally {
   *     span.finish()
   *   }
   * }
   */
  moduleRunner?: ModuleRunner
}

/**
 * SleetClient options, `sleet` are used by the handler, `client` are passed
 * to the Discord.js client
 */
interface SleetClientOptions {
  sleet: SleetOptions
  client: ClientOptions
}

interface PutCommandOptions {
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
 * AsyncLocalStorage for the currently running module, in this current async context
 */
export const runningModuleStore = new AsyncLocalStorage<SleetModule>()

/**
 * A command handler built around Discord.js, the SleetClient handles passing
 * interactions to commands and registering them
 */
export class SleetClient<Ready extends boolean = boolean> extends EventEmitter<
  Required<BaseSleetModuleEventHandlers>
> {
  options: SleetOptions
  client: Client<Ready>
  rest: SleetRest
  // Map<qualifiedName, module>
  modules = new Map<string, SleetModule>()
  // Map<commandName, command>
  commands = new Map<string, SleetCommand>()
  // Map<module, [event, handler][]>
  registeredEvents = new Map<SleetModule, SleetModuleEventRegistration[]>()
  // Set<SleetModule that has shouldHandleEvent handler>
  // Defined this way because of https://github.com/microsoft/TypeScript/issues/42873
  shouldSkipHandlers: Set<SleetModule<Required<SleetExtensions>>> = new Set()
  context: SleetContext
  moduleRunner: ModuleRunner

  constructor(options: SleetClientOptions) {
    super()
    this.options = options.sleet
    this.moduleRunner = options.sleet.moduleRunner ?? defaultModuleRunner

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

      for (const child of module.modules) {
        this.removeModules([child], `${qualifiedName}/`)
      }

      void (async () => {
        try {
          await module.handlers.unload?.call(this.context)
          this.emit('unloadModule', module, qualifiedName)
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e))
          this.emit('sleetError', `Module ${module.name} failed to load`, err)
        }
      })()
    }

    return this
  }

  #registerEventsFor(module: SleetModule) {
    if (!(module instanceof SleetModule)) {
      throw new Error(
        `${String(
          module,
        )} is not a SleetModule, but was being registered for events`,
      )
    }

    const events = this.registeredEvents.get(module) ?? []

    for (const [event, handler] of Object.entries(module.handlers) as [
      keyof SleetModuleEventHandlers,
      SleetModuleEventHandlers[keyof SleetModuleEventHandlers],
    ][]) {
      if (!handler) continue

      this.emit(
        'sleetDebug',
        `Registering event '${event}' for '${module.name}'`,
      )

      if (
        event === 'shouldSkipEvent' &&
        typeof module.handlers.shouldSkipEvent === 'function'
      ) {
        // This is a special case, since we don't use any event emitters for this
        // We need to call each one and track the return value
        this.shouldSkipHandlers.add(
          module as SleetModule<Required<SleetExtensions>>,
        )
        continue
      }

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          name: event as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          arguments: args as any,
        }

        if (await this.#shouldSkipEvent(eventDetails, module)) {
          return
        }

        // Conditional since we don't want to emit eventHandled for eventHandled
        // This causes a cool call stack size exceeded
        if (event !== 'eventHandled') {
          this.emit('eventHandled', eventDetails, module)
        }

        this.moduleRunner(
          module,
          (...args) =>
            runningModuleStore.run<Promise<unknown>, unknown[]>(
              module,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
              boundEvent as any,
              ...args,
            ),
          eventDetails,
        )
      }

      if (isDiscordEvent(event)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        this.client.on(event, eventHandler as any)
      } else if (isSleetEvent(event)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        this.addListener(event, eventHandler as any, argsNum as any)
      } else if (!isSpecialEvent(event)) {
        throw new Error(
          `Unknown event '${String(event)}' while processing ${module.name}`,
        )
      }

      events.push([event, eventHandler])
    }

    this.registeredEvents.set(module, events)
  }

  #unregisterEventsFor(module: SleetModule) {
    if (!(module instanceof SleetModule)) {
      throw new Error(
        `${String(
          module,
        )} is not a SleetModule, but was being unregistered for events`,
      )
    }

    const events = this.registeredEvents.get(module)
    if (!events) return

    for (const [event, eventHandler] of events) {
      if (!eventHandler) continue

      if (isDiscordEvent(event)) {
        // Casts otherwise typescript does some crazy type inference that
        // makes it both error and lag like mad
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        this.client.off(event, eventHandler as any)
      } else if (isSleetEvent(event)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        this.off(event, eventHandler as any)
      } else if (!isSpecialEvent(event)) {
        throw new Error(
          `Unknown event '${String(event)}' while processing ${module.name}`,
        )
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
        (c) =>
          !c.registerOnlyInGuilds || c.registerOnlyInGuilds.includes(guildId),
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

        for (const guildId of command.registerOnlyInGuilds) {
          const commands = toRegister.get(guildId) ?? []
          commands.push(command)
          toRegister.set(guildId, commands)
        }
      }

      for (const [guildId, commands] of toRegister) {
        promises.push(this.putCommands({ commands, guildId }))
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
  login() {
    this.client.once('ready', () => void this.client.application?.fetch())
    return this.client.login(this.options.token)
  }

  /**
   * Handles an incoming interaction, matching it with a registered command
   * @param interaction The interaction to handle
   * @returns Nothing
   */
  async #interactionCreate(interaction: Interaction): Promise<void> {
    if (interaction.type === InteractionType.ApplicationCommand) {
      return this.#handleApplicationInteraction(interaction).then(() => {})
    } else if (
      interaction.type === InteractionType.ApplicationCommandAutocomplete
    ) {
      return this.#handleAutocompleteInteraction(interaction).then(() => {})
    }
  }

  async #handleApplicationInteraction(interaction: ApplicationInteraction) {
    const module = this.commands.get(interaction.commandName)

    if (!module) {
      this.emit(
        'sleetWarn',
        'No module registered for this interaction',
        interaction,
      )
      return
    }

    if (!(module instanceof SleetCommand)) {
      this.emit(
        'sleetWarn',
        `${String(
          module,
        )} is not a SleetCommand, but has registered interactions`,
        interaction.commandName,
      )
      return
    }

    const eventDetails: EventDetails = {
      name: 'interactionCreate',
      arguments: [interaction],
    }

    const skipReason = await this.#shouldSkipEvent(eventDetails, module)

    if (skipReason) {
      await interaction.reply({
        content: `This interaction was skipped for "${skipReason.message}"`,
        ephemeral: skipReason.ephemeral ?? false,
      })
      return
    }

    return this.moduleRunner(
      module,
      () =>
        runningModuleStore.run(module, async () => {
          this.emit('runModule', module, interaction)
          try {
            // Make sure the module can run the incoming type of interaction
            if (
              interaction.commandType === ApplicationCommandType.ChatInput &&
              module instanceof SleetSlashCommand
            ) {
              await module.run(this.context, interaction)
            } else if (
              interaction.commandType === ApplicationCommandType.User &&
              module instanceof SleetUserCommand
            ) {
              await module.run(this.context, interaction)
            } else if (
              interaction.commandType === ApplicationCommandType.Message &&
              module instanceof SleetMessageCommand
            ) {
              await module.run(this.context, interaction)
            } else {
              this.emit(
                'sleetWarn',
                'Module could not handle incoming interaction',
                interaction,
              )
            }
          } catch (e) {
            await this.#handleApplicationInteractionError(
              interaction,
              module,
              e,
            )
          }
        }),
      eventDetails,
    )
  }

  async #handleAutocompleteInteraction(interaction: AutocompleteInteraction) {
    const module = this.commands.get(interaction.commandName)

    if (!module) {
      this.emit(
        'sleetWarn',
        'No module registered for this interaction',
        interaction,
      )
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
        `${String(
          module,
        )} is not a SleetCommand, but has registered interactions`,
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

    const skipReason = await this.#shouldSkipEvent(eventDetails, module)

    if (skipReason) {
      await interaction.respond([
        {
          name: `This interaction was skipped for "${skipReason.message}"`,
          value: 'SKIPPED',
        },
      ])
      return
    }

    return this.moduleRunner(
      module,
      () =>
        runningModuleStore.run(module, async () => {
          try {
            if (module instanceof SleetSlashCommand) {
              await module.autocomplete(this.context, interaction)
            }
          } catch (e) {
            await this.#handleAutocompleteInteractionError(
              interaction,
              module,
              e,
            )
          }
        }),
      eventDetails,
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

  /**
   * Checks if an event and module pair should be skipped by any of the registered skip handlers
   *
   * This also handles emitting "eventSkipped" if the module should be skipped
   *
   * Only the first found skip reason is emitted and returned
   * @param event The event to check
   * @param module The module to check
   * @returns A skip reason if the event should be skipped, false otherwise
   */
  async #shouldSkipEvent(
    event: EventDetails,
    module: SleetModule,
  ): Promise<ShouldSkipEventReturn> {
    for (const skipper of this.shouldSkipHandlers.values()) {
      // TODO: this has the module being run (skipper), but not the module being checked (module)
      const reason = await (
        this.moduleRunner as ModuleRunner<ShouldSkipEventReturn>
      )(
        skipper,
        () =>
          runningModuleStore.run(
            skipper,
            skipper.handlers.shouldSkipEvent,
            event,
            module,
          ),
        event,
      )

      if (reason) {
        this.emit('eventSkipped', event, module, skipper, reason)
        return reason
      }
    }

    return false
  }
}

async function conditionalReply(
  interaction: ApplicationInteraction,
  content: string,
) {
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
