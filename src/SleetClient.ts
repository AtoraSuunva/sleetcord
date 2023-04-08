import { pino, Logger } from 'pino'
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
  isDiscordEvent,
  isSleetEvent,
  isSpecialEvent,
  SleetContext,
  SleetModuleEventHandlers,
} from './modules/events.js'
import EventEmitter from 'events'
import { AsyncLocalStorage } from 'async_hooks'

/**
 * Sleet-specific options
 */
interface SleetOptions {
  token: string
  applicationId: string
}

/**
 * SleetClient options, `sleet` are used by the handler, `client` are passed
 * to the Discord.js client
 */
interface SleetClientOptions {
  sleet: SleetOptions
  client: ClientOptions
  logger?: Parameters<typeof pino>[number]
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

export const runningModuleStore: AsyncLocalStorage<SleetModule> =
  new AsyncLocalStorage()

/**
 * A command handler built around Discord.js, the SleetClient handles passing
 * interactions to commands and registering them
 */
export class SleetClient extends EventEmitter {
  baseLogger: Logger
  #logger: Logger
  options: SleetOptions
  client: Client
  rest: SleetRest
  modules = new Map<string, SleetModule>()
  commands = new Map<string, SleetCommand>()
  registeredEvents = new Map<SleetModule, SleetModuleEventRegistration[]>()
  context: SleetContext

  constructor(options: SleetClientOptions) {
    super()
    this.baseLogger = pino(options.logger)
    this.#logger = this.baseLogger.child({ name: 'SleetClient' })
    this.#logger.debug('Creating new SleetClient')
    this.options = options.sleet

    this.client = new Client(options.client)

    this.rest = new SleetRest({
      token: options.sleet.token,
      applicationId: options.sleet.applicationId,
      logger: this.baseLogger,
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
    this.#logger.debug(
      'Adding modules: %o',
      modules.map((m) => `${namePrefix}${m.name}`),
    )

    for (const module of modules) {
      const prefixedName = `${namePrefix}${module.name}`
      this.#registerEventsFor(module)
      this.modules.set(prefixedName, module)

      if (isSleetCommand(module)) {
        if (this.commands.has(module.name)) {
          this.#logger.warn('Overwriting existing command with name %s', name)
        }

        this.commands.set(module.name, module)
      }

      for (const child of module.modules) {
        this.addModules([child], `${prefixedName}/`)
      }

      module.handlers.load?.call(this.context)
      this.emit('loadModule', module)
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
    this.#logger.debug(
      'Removing modules: %o',
      modules.map((m) => `${namePrefix}${m.name}`),
    )

    for (const module of modules) {
      const prefixedName = `${namePrefix}${module.name}`
      this.#unregisterEventsFor(module)
      this.modules.delete(prefixedName)

      if (isSleetCommand(module)) {
        this.commands.delete(module.name)
      }

      for (const child of module.modules) {
        this.removeModules([child], `${prefixedName}/`)
      }

      module.handlers.unload?.call(this.context)
      this.emit('unloadModule', module)
    }

    return this
  }

  #registerEventsFor(module: SleetModule) {
    const events = this.registeredEvents.get(module) ?? []

    for (const [event, handler] of Object.entries(module.handlers)) {
      this.#logger.debug(`Registering event '${event}' for '${module.name}'`)
      const eventHandler = handler.bind(this.context)

      if (isDiscordEvent(event)) {
        this.client.on(event, eventHandler)
      } else if (isSleetEvent(event)) {
        this.on(event, eventHandler)
      } else if (!isSpecialEvent(event)) {
        throw new Error(
          `Unknown event '${event}' while processing ${module.name}`,
        )
      }

      events.push([event as keyof SleetModuleEventHandlers, eventHandler])
    }

    this.registeredEvents.set(module, events)
  }

  #unregisterEventsFor(module: SleetModule) {
    const events = this.registeredEvents.get(module)
    if (!events) return

    for (const [event, eventHandler] of events) {
      if (!eventHandler) continue

      if (isDiscordEvent(event)) {
        // Casts otherwise typescript does some crazy type inferrence that
        // makes it both error and lag like mad
        this.client.off(event, eventHandler as unknown as () => Awaitable<void>)
      } else if (isSleetEvent(event)) {
        this.off(event, eventHandler)
      } else if (!isSpecialEvent(event)) {
        throw new Error(
          `Unknown event '${event}' while processing ${module.name}`,
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

    const sleetCommands = commands || Array.from(this.commands.values())

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

    this.#logger.debug(
      'Putting commands (%s) to api: %o',
      guildId ? `in ${guildId}` : 'globally',
      toAdd.map((c) => c.name),
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
   * @returns This SleetClient for chaining
   */
  login(): this {
    this.#logger.debug('Logging in')
    this.client.login(this.options.token)
    this.client.once('ready', () => void this.client.application?.fetch())
    return this
  }

  /**
   * Handles an incoming interaction, matching it with a registered command
   * @param interaction The interaction to handle
   * @returns Nothing
   */
  async #interactionCreate(interaction: Interaction): Promise<void> {
    this.#logger.debug('Handling interaction: %o', interaction)

    if (interaction.type === InteractionType.ApplicationCommand) {
      this.#handleApplicationInteraction(interaction)
    } else if (
      interaction.type === InteractionType.ApplicationCommandAutocomplete
    ) {
      this.#handleAutocompleteInteraction(interaction)
    }
  }

  async #handleApplicationInteraction(interaction: ApplicationInteraction) {
    const module = this.commands.get(interaction.commandName)

    if (!(module instanceof SleetCommand)) {
      this.#logger.error(
        'Module "%s" is not a SleetCommand, but has registered interactions',
        interaction.commandName,
      )
      return
    }

    if (!module) {
      this.#logger.error('No module found for %s', interaction.commandName)
      return
    }

    runningModuleStore.run(module, async () => {
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
          this.#logger.error(
            'Module "%s" could not handle incoming interaction: %o',
            interaction.commandName,
            interaction,
          )
        }
      } catch (e: unknown) {
        this.#handleApplicationInteractionError(interaction, module, e)
      }
    })
  }

  async #handleAutocompleteInteraction(interaction: AutocompleteInteraction) {
    const module = this.commands.get(interaction.commandName)

    if (!module) {
      this.#logger.error('No module found for %s', interaction.commandName)
      return
    }

    runningModuleStore.run(module, async () => {
      try {
        if (module instanceof SleetSlashCommand) {
          await module.autocomplete(this.context, interaction)
        }
      } catch (e: unknown) {
        this.#handleAutocompleteInteractionError(interaction, module, e)
      }
    })
  }

  #handleAutocompleteInteractionError(
    interaction: AutocompleteInteraction,
    module: SleetModule,
    error: unknown,
  ) {
    this.emit('autocompleteInteractionError', module, interaction, error)
    this.#logger.error(
      error,
      'Error handling autocomplete for module "%s" on interaction %o',
      module.name,
      interaction,
    )
    const response = [
      {
        name: `An error occurred while handling autocomplete for ${module.name}`,
        value: 'ERROR',
      },
    ]

    if (!interaction.responded) {
      interaction.respond(response)
    }
  }

  #handleApplicationInteractionError(
    interaction: ApplicationInteraction,
    module: SleetModule,
    error: unknown,
  ) {
    if (error instanceof PreRunError) {
      const content = `:warning: ${error.message}`
      conditionalReply(interaction, content)
    } else {
      this.emit('applicationInteractionError', module, interaction, error)
      this.#logger.error(
        error,
        'Error running module "%s" on interaction %o',
        module.name,
        interaction,
      )
      const content = `:warning: An unexpected error occurred while running this command, please try again later.\n${error}`
      conditionalReply(interaction, content)
    }
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
        interaction.editReply(content)
      }, 1000)
    }
  } else {
    interaction.reply({
      content,
      ephemeral: true,
    })
  }
}
