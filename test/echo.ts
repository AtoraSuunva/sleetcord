import { ApplicationCommandOptionType } from 'discord-api-types/v10'
import { CommandInteraction } from 'discord.js'
import { SleetSlashCommand } from '../src/modules/slash/SleetSlashCommand.js'
import { getUsers } from '../src/parsers/resolvedData.js'

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
        autocomplete: (interaction, name, value) => [
          {
            name: value,
            value: `${value}!`,
          },
        ],
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
    run: async (interaction: CommandInteraction) => {
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
