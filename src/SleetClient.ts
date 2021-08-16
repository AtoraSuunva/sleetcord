import { Client, Interaction } from 'discord.js'
import {
  Command,
  MessageCommand,
  SlashCommand,
  UserCommand,
} from './commands/CommandBuilder'
import { handleMessageInteraction } from './handlers/MessageInteractionHandler'
import { handleSlashInteraction } from './handlers/SlashInteractionHandler'
import { handleUserInteraction } from './handlers/UserInteractionHandler'

interface SleetClientOptions {
  commands?: Command<unknown>[]
  commandDirectory?: string
}

class SleetClient {
  client: Client<boolean>
  slashCommands: Map<string, SlashCommand>
  userCommands: Map<string, UserCommand>
  messageCommands: Map<string, MessageCommand>
  commandDirectory?: string

  constructor(client: Client<boolean>, options: SleetClientOptions = {}) {
    const { commands = [], commandDirectory } = options

    this.client = client
    this.slashCommands = new Map()
    this.userCommands = new Map()
    this.messageCommands = new Map()

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

  private interactionHandler(interaction: Interaction): void {
    console.log('Handling', interaction.type, 'from', interaction.user.tag)

    if (interaction.isContextMenu()) {
      if (interaction.targetType === 'MESSAGE') {
        handleMessageInteraction(interaction)
      } else if (interaction.targetType === 'USER') {
        handleUserInteraction(interaction)
      }
    } else if (interaction.isCommand()) {
      handleSlashInteraction(this.slashCommands, interaction)
    }
  }

  login(token: string): void {
    this.client.login(token)
  }
}

export default SleetClient
