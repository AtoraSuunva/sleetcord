import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from 'discord-api-types/v9'
import { SleetMessageCommand } from '../modules/SleetMessageCommand.js'
import { SleetSlashCommand } from '../modules/SleetSlashCommand.js'
import { SleetUserCommand } from '../modules/SleetUserCommand.js'

export const slashCommand = new SleetSlashCommand(
  {
    name: 'slash-test',
    description: 'Echoes the message',
    options: [
      {
        name: 'message',
        type: ApplicationCommandOptionType.String,
        description: 'The message to echo',
        required: true,
      },
    ],
  },
  {
    run: (interaction) => {
      const message = interaction.options.getString('message', true)
      interaction.reply(message)
    },
  },
)

export const userCommand = new SleetUserCommand(
  {
    name: 'User Test',
    type: ApplicationCommandType.User,
  },
  {
    run: (interaction, user) => {
      return interaction.reply(user.username)
    },
  },
)

export const messageCommand = new SleetMessageCommand(
  {
    name: 'Message Test',
    type: ApplicationCommandType.Message,
  },
  {
    run: (interaction, message) => {
      return interaction.reply(message.content)
    },
  },
)
