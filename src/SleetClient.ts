import { Logger } from 'pino'
import { baseLogger } from './utils/logger.js'
import { Client, ClientOptions, Interaction } from 'discord.js'
import { Command } from './commands/Command.js'
import { SlashCommand } from './commands/SlashCommand.js'
import { ContextMenuCommand } from './commands/ContextMenuCommand.js'
import { SleetRest } from './SleetRest.js'

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
  commands?: Command[]
  /** The guild to PUT to, if any */
  guildId?: string
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
  commands = new Map<string, Command>()

  constructor(options: SleetClientOptions) {
    this.#logger.debug('Creating new SleetClient')
    this.options = options.sleet
    this.client = new Client(options.client)
    this.rest = new SleetRest(options.sleet.token, options.sleet.applicationId)

    this.client.on('interactionCreate', this.#interactionCreate.bind(this))
  }

  /**
   * Adds a set of commands to Sleet, which will handle incoming interactions
   * that match them by name
   * @param commands The commands to add
   * @returns This SleetClient for chaining
   */
  addCommands(commands: Command[]): this {
    this.#logger.debug('Adding commands: %o', commands)
    commands.forEach((command) => this.commands.set(command.name, command))
    return this
  }

  /**
   * Removes a set of commands from Sleet, they will no longer handle incoming
   * interactions
   * @param commands The commands to remove
   * @returns This SleetClient for chaining
   */
  removeCommands(commands: Command[]): this {
    this.#logger.debug('Removing commands: %o', commands)
    commands.forEach((command) => this.commands.delete(command.name))
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
    const toAdd = commands || Array.from(this.commands.values())
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
      const command = this.commands.get(interaction.commandName)
      if (!command) {
        this.#logger.warn('No command found for %s', interaction.commandName)
        return
      }

      if (interaction.isCommand() && command instanceof SlashCommand) {
        command.run(interaction)
      } else if (
        interaction.isContextMenu() &&
        command instanceof ContextMenuCommand
      ) {
        command.run(interaction)
      }
    }

    // Handle Autocomplete & Message Component later?
  }
}
