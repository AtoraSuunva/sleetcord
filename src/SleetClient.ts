import { Logger } from 'pino'
import { baseLogger } from './utils/logger.js'
import {
  BaseCommandInteraction,
  Client,
  ClientOptions,
  Interaction,
} from 'discord.js'
import { SleetRest } from './SleetRest.js'
import { PreRunError } from './errors/PreRunError.js'
import { SleetCommand } from './modules/SleetCommand.js'
import { SleetModule } from './modules/SleetModule.js'
import { SleetSlashCommand } from './modules/SleetSlashCommand.js'
import { SleetUserCommand } from './modules/SleetUserCommand.js'
import { SleetMessageCommand } from './modules/SleetMessageCommand.js'

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
  commands?: SleetCommand[]
  /** The guild to PUT to, if any */
  guildId?: string
}

function isSleetCommand(value: unknown): value is SleetCommand {
  return value instanceof SleetCommand
}

/**
 * A command handler built around Discord.js, the SleetClient handles passing
 * interactions to commands and registering them
 */
export class SleetClient {
  #logger: Logger = baseLogger.child({ name: 'SleetClient' })
  options: SleetOptions
  client: Client
  rest: SleetRest
  modules = new Map<string, SleetModule>()

  constructor(options: SleetClientOptions) {
    this.#logger.debug('Creating new SleetClient')
    this.options = options.sleet
    this.client = new Client(options.client)
    this.rest = new SleetRest(options.sleet.token, options.sleet.applicationId)

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
    this.#logger.debug('Adding modules: %o', modules)
    modules.forEach((module) => this.modules.set(module.name, module))
    return this
  }

  /**
   * Removes a set of modules from Sleet, they will no longer handle incoming
   * events/interactions
   * @param modules The modules to remove
   * @returns This SleetClient for chaining
   */
  removeModules(modules: SleetModule[]): this {
    this.#logger.debug('Removing modules: %o', modules)
    modules.forEach((module) => this.modules.delete(module.name))
    return this
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

    this.#logger.debug('Putting commands to api: %o', toAdd)
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
          await module.run(interaction)
        } else if (
          interaction.isUserContextMenu() &&
          module instanceof SleetUserCommand
        ) {
          await module.run(interaction)
        } else if (
          interaction.isMessageContextMenu() &&
          module instanceof SleetMessageCommand
        ) {
          await module.run(interaction)
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
    // Handle Autocomplete & Message Component later?
  }

  #handleInteractionError(
    interaction: BaseCommandInteraction,
    module: SleetModule,
    error: unknown,
  ) {
    if (error instanceof PreRunError) {
      interaction.reply({
        content: `:warning: ${error.message}`,
        ephemeral: true,
      })
    } else {
      this.#logger.error(
        error,
        'Error running module "%s" on interaction %o',
        module.name,
        interaction,
      )
      interaction.reply({
        content: `:warning: An unexpected error occurred while running this command, please try again later.\n${error}`,
        ephemeral: true,
      })
    }
  }
}
