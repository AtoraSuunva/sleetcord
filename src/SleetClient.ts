import { Client, Interaction } from 'discord.js'
import { handleMessageInteraction } from './handlers/MessageInteractionHandler'
import { handleSlashInteraction } from './handlers/SlashInteractionHandler'
import { handleUserInteraction } from './handlers/UserInteractionHandler'
import { MessageCommand } from './commands/builders/MessageCommand'
import { SlashCommand } from './commands/builders/SlashCommand'
import { UserCommand } from './commands/builders/UserCommand'
import { baseLogger } from './logger'

const logger = baseLogger.child({
  name: 'SleetClient',
})

interface SleetClientOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commands?: (SlashCommand<any> | UserCommand | MessageCommand)[]
  commandDirectory?: string
}

class SleetClient {
  client: Client<boolean>
  slashCommands = new Map<string, SlashCommand<unknown>>()
  userCommands = new Map<string, UserCommand>()
  messageCommands = new Map<string, MessageCommand>()
  commandDirectory?: string

  constructor(client: Client<boolean>, options: SleetClientOptions = {}) {
    logger.debug(`Setting up SleetClient`)
    const { commands = [], commandDirectory } = options

    this.client = client

    for (const command of commands) {
      if (command instanceof SlashCommand) {
        this.slashCommands.set(command.data.name, command)
      } else if (command instanceof UserCommand) {
        this.userCommands.set(command.data.name, command)
      } else if (command instanceof MessageCommand) {
        this.messageCommands.set(command.data.name, command)
      } else {
        throw new Error(`Invalid command provided: ${command}`)
      }
    }

    this.commandDirectory = commandDirectory
    this.client.on('interactionCreate', this.interactionHandler)
  }

  interactionHandler = (interaction: Interaction): void => {
    logger.debug(`Handling ${interaction.type} from ${interaction.user.tag}`)

    if (interaction.isContextMenu()) {
      if (interaction.targetType === 'MESSAGE') {
        handleMessageInteraction(this.messageCommands, interaction)
      } else if (interaction.targetType === 'USER') {
        handleUserInteraction(this.userCommands, interaction)
      }
    } else if (interaction.isCommand()) {
      handleSlashInteraction(this.slashCommands, interaction)
    }
  }

  login = (token: string): void => {
    this.client.login(token)
  }
}

export default SleetClient
