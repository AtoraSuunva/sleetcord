import { Logger } from 'pino'
import { baseLogger } from './utils/logger.js'
import {
  AutocompleteInteraction,
  Awaitable,
  BaseCommandInteraction,
  Client,
  ClientEvents,
  ClientOptions,
  CommandInteraction,
  Interaction,
} from 'discord.js'
import { SleetRest } from './SleetRest.js'
import { PreRunError } from './errors/PreRunError.js'
import { SleetCommand } from './modules/base/SleetCommand.js'
import { SleetModule } from './modules/base/SleetModule.js'
import { SleetSlashCommand } from './modules/slash/SleetSlashCommand.js'
import { SleetUserCommand } from './modules/context-menu/SleetUserCommand.js'
import { SleetMessageCommand } from './modules/context-menu/SleetMessageCommand.js'
import {
  isDiscordEvent,
  isSleetEvent,
  isSpecialEvent,
  SleetContext,
  SleetModuleEventHandlers,
} from './modules/events.js'
import EventEmitter from 'events'

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
}

interface PutCommandOptions {
  /** The commands to PUT, if any (defaults to added commands) */
  commands?: SleetCommand<CommandInteraction>[]
  /** The guild to PUT to, if any */
  guildId?: string
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
export class SleetClient extends EventEmitter {
  #logger: Logger = baseLogger.child({ name: 'SleetClient' })
  options: SleetOptions
  client: Client
  rest: SleetRest
  modules = new Map<string, SleetModule>()
  registeredEvents = new Map<SleetModule, SleetModuleEventRegistration[]>()
  context: SleetContext

  constructor(options: SleetClientOptions) {
    super()
    this.#logger.debug('Creating new SleetClient')
    this.options = options.sleet
    this.client = new Client(options.client)
    this.rest = new SleetRest(options.sleet.token, options.sleet.applicationId)
    this.context = {
      sleet: this,
      client: this.client,
    }

    this.client.on('interactionCreate', this.#interactionCreate.bind(this))
  }

  /**
   * Adds a set of modules to Sleet, which will handle incoming events using their handlers.
   *
   * {@link SleetCommand} is a special module that can also handle incoming interactions, and will be routed automatically by Sleet.
   * @param modules The modules to add
   * @returns This SleetClient for chaining
   */
  addModules(modules: SleetModule[]): this {
    this.#logger.debug(
      'Adding modules: %o',
      modules.map((m) => m.name),
    )

    for (const module of modules) {
      this.#registerEventsFor(module)
      this.modules.set(module.name, module)
      module.handlers.load?.call(this.context)
      this.emit('loadModule', module)
    }

    return this
  }

  /**
   * Removes a set of modules from Sleet, they will no longer handle incoming
   * events/interactions
   * @param modules The modules to remove
   * @returns This SleetClient for chaining
   */
  removeModules(modules: SleetModule[]): this {
    this.#logger.debug(
      'Removing modules: %o',
      modules.map((m) => m.name),
    )

    for (const module of modules) {
      this.#unregisterEventsFor(module)
      this.modules.delete(module.name)
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
        // "Expression produces a union type that is too complex to represent."
        // ???? what do you mean ????
        this.client.off(
          event as keyof ClientEvents,
          eventHandler as unknown as () => Awaitable<void>,
        )
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
   * Use this **only** when you want to fully all sync commands
   * @param options Options for the PUT
   * @returns The response from Discord
   */
  async putCommands(options: PutCommandOptions = {}): Promise<unknown> {
    const { commands, guildId } = options
    const toAdd =
      commands || Array.from(this.modules.values()).filter(isSleetCommand)

    this.#logger.debug(
      'Putting commands to api: %o',
      toAdd.map((c) => c.name),
    )
    const body = toAdd.map((command) => command.body)

    if (guildId) {
      return this.rest.putGuildCommands(body, guildId)
    } else {
      return this.rest.putCommands(body)
    }
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

    if (interaction.isApplicationCommand()) {
      this.#handleApplicationInteraction(interaction)
    } else if (interaction.isAutocomplete()) {
      this.#handleAutocompleteInteraction(interaction)
    }
  }

  async #handleApplicationInteraction(interaction: BaseCommandInteraction) {
    const module = this.modules.get(interaction.commandName)

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

    try {
      // May seem redundant, but this ensures that the right type of command is invoked
      // A SleetMessageCommand cannot handle an incoming interaction mistakenly registered as a UserContextMenu one
      if (interaction.isCommand() && module instanceof SleetSlashCommand) {
        await module.run(this.context, interaction)
      } else if (
        interaction.isUserContextMenu() &&
        module instanceof SleetUserCommand
      ) {
        await module.run(this.context, interaction)
      } else if (
        interaction.isMessageContextMenu() &&
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
      this.#handleInteractionError(interaction, module, e)
    }
  }

  async #handleAutocompleteInteraction(interaction: AutocompleteInteraction) {
    const module = this.modules.get(interaction.commandName)

    if (!module) {
      this.#logger.error('No module found for %s', interaction.commandName)
      return
    }

    try {
      if (module instanceof SleetSlashCommand) {
        await module.autocomplete(this.context, interaction)
      }
    } catch (e: unknown) {
      this.#handleAutocompleteInteractionError(interaction, module, e)
    }
  }

  #handleAutocompleteInteractionError(
    interaction: AutocompleteInteraction,
    module: SleetModule,
    error: unknown,
  ) {
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

  #handleInteractionError(
    interaction: BaseCommandInteraction,
    module: SleetModule,
    error: unknown,
  ) {
    if (error instanceof PreRunError) {
      const content = `:warning: ${error.message}`
      conditionalReply(interaction, content)
    } else {
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

function conditionalReply(
  interaction: BaseCommandInteraction,
  content: string,
) {
  if (interaction.deferred) {
    interaction.editReply(content)
  } else {
    interaction.reply({
      content,
      ephemeral: true,
    })
  }
}
