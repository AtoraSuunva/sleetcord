import { ApplicationCommandOptionType } from 'discord-api-types/v10'
import { CommandInteraction } from 'discord.js'
import { PreRunError } from '../errors/PreRunError.js'
import { SleetSlashCommand } from '../modules/slash/SleetSlashCommand.js'
import { getUsers } from '../parsers/resolvedData.js'
import { getIntInRange } from '../validation/integers.js'

export const purge = new SleetSlashCommand(
  {
    name: 'purge',
    description: 'Purges a number of messages',
    default_member_permissions: ['MANAGE_MESSAGES'],
    dm_permission: false,
    options: [
      {
        name: 'count',
        type: ApplicationCommandOptionType.Integer,
        description: 'The number of messages to purge (default: 100)',
      },
      {
        name: 'content',
        type: ApplicationCommandOptionType.String,
        description: 'Purge messages with this content (case-insensitive)',
      },
      {
        name: 'from',
        type: ApplicationCommandOptionType.String,
        description:
          'The users/roles to purge messages from (default: everyone)',
      },
      {
        name: 'mentions',
        type: ApplicationCommandOptionType.String,
        description:
          'Purge only messages that mention a user/role (default: none)',
      },
      {
        name: 'bots',
        type: ApplicationCommandOptionType.Boolean,
        description: 'Purge only bots (default: false)',
      },
      {
        name: 'emoji',
        type: ApplicationCommandOptionType.Boolean,
        description:
          'Purge only messages that contain an emoji (default: none)',
      },
      {
        name: 'embeds',
        type: ApplicationCommandOptionType.Boolean,
        description: 'Purge only messages with embeds (default: false)',
      },
      {
        name: 'before',
        type: ApplicationCommandOptionType.String,
        description: 'Purge only messages before this message (default: none)',
      },
      {
        name: 'after',
        type: ApplicationCommandOptionType.String,
        description: 'Purge only messages after this message (default: none)',
      },
      {
        name: 'channel',
        type: ApplicationCommandOptionType.Channel,
        description:
          'The channel to purge messages from (default: current channel)',
      },
      {
        name: 'reason',
        type: ApplicationCommandOptionType.String,
        description: 'The reason for the purge (default: you!)',
      },
      {
        name: 'silent',
        type: ApplicationCommandOptionType.Boolean,
        description: 'Silent purge (default: true)',
      },
    ],
  },
  {
    run: runPurge,
  },
)

async function runPurge(interaction: CommandInteraction) {
  const count =
    getIntInRange(interaction, {
      name: 'count',
      min: 1,
      max: 100,
    }) ?? 100

  const content = interaction.options.getString('content')
  // TODO: not getUsers, getMentionables (users/roles)
  const from = getUsers(interaction, 'from')
  const mentions = getUsers(interaction, 'mentions')
  const botsOnly = interaction.options.getBoolean('bots') ?? false
  const emojiOnly = interaction.options.getBoolean('emoji') ?? false
  const embedsOnly = interaction.options.getBoolean('embeds') ?? false

  const before = interaction.options.getString('before')
  const after = interaction.options.getString('after')

  // TODO: getTextBasedChannel(interaction, 'channel'): TextBasedChannel
  const channel =
    interaction.options.getChannel('channel') ?? interaction.channel
  const reason =
    interaction.options.getString('reason') ?? `Purge by ${interaction.member}`
  const silent = interaction.options.getBoolean('silent') ?? true

  if (!channel) {
    throw new PreRunError("Somehow, you're not in a channel.")
  }

  await interaction.deferReply()

  /** Fetch messages before this message */
  let offset = before
  /** Messages that were purged so far */
  let deletedCount = 0
  /** Try 3 times to fetch messages if the count hasn't been reached, keeps the bot from searching forever */
  let triesLeft = 3

  while (deletedCount < count && triesLeft > 0) {
    const messages = await channel.messages.fetch({
      limit: Math.min(count, 100),
      before,
      after,
    })

    if (messages.size === 0) {
      break
    }

    const filteredMessages = messages
      .filter((message) => {
        if (content && !message.content.toLowerCase().includes(content)) {
          return false
        }

        if (from && !from.includes(message.author)) {
          return false
        }

        if (
          mentions &&
          !mentions.some((mention) => message.mentions.has(mention))
        ) {
          return false
        }

        if (botsOnly && !message.author.bot) {
          return false
        }

        if (emojiOnly && !message.content.includes('<:')) {
          return false
        }

        if (embedsOnly && !message.embeds.length) {
          return false
        }

        return true
      })
      .sort((a, b) => b.createdTimestamp - a.createdTimestamp)

    if (filteredMessages.size === 0) {
      break
    }

    await channel.bulkDelete(filteredMessages, {
      reason,
      silent,
    })

    deletedCount += filteredMessages.size
    if (filteredMessages.size === 0) triesLeft -= 1
  }
}
