import {
  ChatInputCommandInteraction,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
} from 'discord.js'
import {
  SleetMessageCommand,
  SleetSlashCommand,
  SleetUserCommand,
} from '../src/index.js'

/**
 * Test locking a command to just 1 guild
 * Command will not be published globally, or to any other guilds
 */
export const secretSlashCommand = new SleetSlashCommand(
  {
    name: 'secret',
    registerOnlyInGuilds: ['211956704798048256'],
    description: 'Secret command, this should only be in 1 guild!!',
  },
  {
    run: (interaction: ChatInputCommandInteraction) => {
      interaction.reply('This command is secret!!')
    },
  },
)

export const secretMessageCommand = new SleetMessageCommand(
  {
    name: 'secret (message)',
    registerOnlyInGuilds: ['211956704798048256'],
  },
  {
    run: (interaction: MessageContextMenuCommandInteraction) => {
      interaction.reply('This command is secret!!')
    },
  },
)

export const secretUserCommand = new SleetUserCommand(
  {
    name: 'secret (user)',
    registerOnlyInGuilds: ['211956704798048256'],
  },
  {
    run: (interaction: UserContextMenuCommandInteraction) => {
      interaction.reply('This command is secret!!')
    },
  },
)
