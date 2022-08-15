import { ApplicationCommandOptionType } from 'discord-api-types/v10'
import { ChatInputCommandInteraction } from 'discord.js'
import {
  SleetSlashCommand,
  getUsers,
  AutocompleteHandler,
} from '../src/index.js'

const messageAutocomplete: AutocompleteHandler<string> = ({ value }) => [
  {
    name: value,
    value: `${value}!`,
  },
]

export const echo = new SleetSlashCommand(
  {
    name: 'echo',
    description: 'Echoes the message',
    options: [
      {
        name: 'message',
        type: ApplicationCommandOptionType.String,
        description: 'The message to echo',
        required: true,
        autocomplete: messageAutocomplete,
      },
      {
        name: 'ephemeral',
        type: ApplicationCommandOptionType.Boolean,
        description: 'Ephemeral echo',
      },
      {
        name: 'allowed_mentions',
        type: ApplicationCommandOptionType.String,
        description: 'What users to allow to mention',
      },
    ],
  },
  {
    run: async (interaction: ChatInputCommandInteraction) => {
      const message = interaction.options.getString('message', true)
      const ephemeral =
        interaction.options.getBoolean('ephemeral', false) ?? false
      const allowedMentions =
        (await getUsers(interaction, 'allowed_mentions')) ?? []
      const users = allowedMentions.map((user) => user.id)

      interaction.reply({
        content: message,
        ephemeral,
        allowedMentions: {
          users,
        },
      })
    },
  },
)
