import { ApplicationCommandOptionType } from 'discord-api-types/v9'
import { CommandInteraction, ContextMenuInteraction, Message } from 'discord.js'
import {
  bulkRegisterInteractionsGlobally,
  bulkRegisterInteractionsInGuild,
  registerInteractionGlobally,
  registerInteractionInGuild,
} from '../registars/InteractionRegistrar'
import { InteractionCommand } from './CommandTypes'
import { SlashCommand } from './CommandBuilder'
import { ApplicationCommandTypes } from '../constants/ApplicationCommandTypes'

const ping = new SlashCommand('ping', 'Replies with pong')
  .addOption('louder', 'Ping, but louder', ApplicationCommandOptionType.Boolean)
  .onInteractionCreate((interaction) => {
    const louder = interaction.options.getBoolean('louder') ?? false
    interaction.reply(louder ? 'PONG!!!' : 'Pong! But cooler!')
  })

export const commands: InteractionCommand[] = [
  {
    ...ping.data,
  },
  {
    name: 'repeat',
    type: ApplicationCommandTypes.MESSAGE,
    run: (interaction: ContextMenuInteraction, message: Message): void => {
      interaction.reply(`Repeating: ${message.content}`)
    },
  },
  {
    name: '🥚',
    type: ApplicationCommandTypes.MESSAGE,
    run: (interaction: ContextMenuInteraction, message: Message): void => {
      message.react('🥚')
      interaction.reply({
        content: 'Egged that message',
        ephemeral: true,
      })
    },
  },
  {
    name: 'echo',
    description: 'Echos your text',
    type: ApplicationCommandTypes.CHAT_INPUT,
    options: [
      {
        name: 'message',
        description: 'The message to echo',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'uppercase',
        description: 'Make the message uppercase',
        type: ApplicationCommandOptionType.Boolean,
      },
    ],
    run: (interaction: CommandInteraction): void => {
      const message = interaction.options.getString('message', true)
      const uppercase = interaction.options.getBoolean('uppercase') ?? false

      interaction.reply(uppercase ? message.toUpperCase() : message)
    },
  },
  {
    name: 'register',
    description: 'Registers commands',
    type: ApplicationCommandTypes.CHAT_INPUT,
    devGuildOnly: true,
    options: [
      {
        name: 'single',
        description: 'Register a single command',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'name',
            description: 'The name of the command to register',
            type: ApplicationCommandOptionType.String,
            required: true,
          },
          {
            name: 'global',
            description: 'Register this command globally',
            type: ApplicationCommandOptionType.Boolean,
          },
        ],
      },
      {
        name: 'all',
        description: 'Register all commands',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'global',
            description: 'Register all commands globally',
            type: ApplicationCommandOptionType.Boolean,
          },
        ],
      },
    ],
    run: async (interaction: CommandInteraction): Promise<unknown> => {
      const subcommand = interaction.options.getSubcommand()

      if (subcommand === 'single') {
        const name = interaction.options.getString('name', true)
        const global = interaction.options.getBoolean('global') || false

        const command = commands.find((c) => c.name === name)

        if (!command) {
          return interaction.reply({
            content: `I couldn't find a command called "${name}"`,
            ephemeral: true,
          })
        }

        if (global && !interaction.guildId) {
          return interaction.reply({
            content: 'You must be in a guild to register non-global commands',
            ephemeral: true,
          })
        }

        const reply = interaction.reply({
          content: `Got it, registering "${name}"${global ? ' globally' : ''}!`,
          ephemeral: true,
        })

        try {
          if (global) {
            await registerInteractionGlobally(command)
          } else if (interaction.inGuild()) {
            await registerInteractionInGuild(interaction.guildId, command)
          }
        } catch (e) {
          return interaction.editReply(`Failed to register "${name}", ${e}`)
        }

        await reply
        return interaction.editReply(`Registered "${name}" successfully!`)
      } else if (subcommand === 'all') {
        const global = interaction.options.getBoolean('global') || false

        if (global && !interaction.guildId) {
          return interaction.reply({
            content: 'You must be in a guild to register non-global commands',
            ephemeral: true,
          })
        }

        const reply = interaction.reply({
          content: `Got it, registering all commands${
            global ? ' globally' : ''
          }!`,
          ephemeral: true,
        })

        try {
          if (global) {
            await bulkRegisterInteractionsGlobally(commands)
          } else if (interaction.inGuild()) {
            await bulkRegisterInteractionsInGuild(interaction.guildId, commands)
          }
        } catch (e) {
          return interaction.editReply(`Failed to register all commands, ${e}`)
        }

        await reply
        return interaction.editReply(`Registered all commands successfully!`)
      }
      return null
    },
  },
]
