import { ApplicationCommandOptionType } from 'discord-api-types/v10'
import {
  ChatInputCommandInteraction,
  Collection,
  DMChannel,
  FetchMessagesOptions,
  GuildMember,
  Message,
  Snowflake,
  User,
} from 'discord.js'
import {
  Mentionable,
  PreRunError,
  SleetSlashCommand,
  botHasPermissionsGuard,
  getMentionables,
  getTextBasedChannel,
  inGuildGuard,
} from '../../src/index.js'

export const purge = new SleetSlashCommand(
  {
    name: 'purge',
    description: 'Purges a number of messages',
    default_member_permissions: ['ManageMessages'],
    dm_permission: false,
    options: [
      {
        name: 'count',
        type: ApplicationCommandOptionType.Integer,
        description: 'The number of messages to purge (default: 100)',
        min_value: 1,
        max_value: 100,
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
        type: ApplicationCommandOptionType.Integer,
        description:
          'Purge only messages with this many or more embeds (default: 0)',
        min_value: 0,
      },
      {
        name: 'before',
        type: ApplicationCommandOptionType.String,
        description:
          'Purge only messages before this message ID (default: none)',
      },
      {
        name: 'after',
        type: ApplicationCommandOptionType.String,
        description:
          'Purge only messages after this message ID (default: none)',
      },
      {
        name: 'channel',
        type: ApplicationCommandOptionType.Channel,
        description:
          'The channel to purge messages from (default: current channel)',
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

const MAX_FETCH_MESSAGES = 100

/**
 * Purge a set of messages based on a couple filter criteria.
 * @param interaction The interaction to use
 */
async function runPurge(interaction: ChatInputCommandInteraction) {
  inGuildGuard(interaction)
  await botHasPermissionsGuard(interaction, [
    'ViewChannel',
    'ManageMessages',
    'ReadMessageHistory',
  ])

  const count = interaction.options.getInteger('count') ?? MAX_FETCH_MESSAGES
  const content = interaction.options.getString('content')
  const from = await getMentionables(interaction, 'from')
  const mentions = await getMentionables(interaction, 'mentions')
  const bots = interaction.options.getBoolean('bots') ?? false
  const emoji = interaction.options.getBoolean('emoji') ?? false
  const embeds = interaction.options.getInteger('embeds') ?? 0
  const before = interaction.options.getString('before')
  const after = interaction.options.getString('after')

  const channelOption = interaction.options.getChannel('channel')
  const channel = channelOption
    ? await getTextBasedChannel(interaction, 'channel')
    : interaction.channel

  if (channel === null) {
    throw new PreRunError('You need to provide a text channel or thread')
  }

  if (channel instanceof DMChannel) {
    throw new PreRunError('You must provide a guild channel')
  }

  const silent = interaction.options.getBoolean('silent') ?? true

  await interaction.deferReply({ ephemeral: silent })

  /**
   * Fetch messages after this offset
   *
   * Only used if we're searching forwards (!before && after)
   */
  let afterOffset = after
  /**
   * Fetch messages before this message
   *
   * Only used if we're searching forwards (not (!before && after))
   */
  let beforeOffset = before
  /** Messages that were purged so far */
  let deletedCount = 0
  /** Try 3 times to fetch messages if the count hasn't been reached, keeps the bot from searching forever */
  let triesLeft = 3

  while (deletedCount < count && triesLeft > 0) {
    const fetchOptions = getFetchOptions(afterOffset, beforeOffset)
    const messages = await channel.messages.fetch(fetchOptions)

    if (!before && after) {
      // Forward search
      const youngestMessage = messages.sort(youngestFirst).first()

      if (youngestMessage === undefined || youngestMessage.id === afterOffset) {
        break
      }

      afterOffset = youngestMessage.id
    } else {
      // Backward search
      const oldestMessage = messages.sort(youngestFirst).last()

      if (oldestMessage === undefined || oldestMessage.id === beforeOffset) {
        break
      }

      beforeOffset = oldestMessage.id
    }

    const filteredMessages = filterMessages(messages, {
      after,
      before,
      content,
      from,
      mentions,
      bots,
      emoji,
      embeds,
    })

    if (filteredMessages.size === 0) {
      triesLeft -= 1
      continue
    }

    const toPurge = filteredMessages
      .sort(youngestFirst)
      .first(count - deletedCount)

    const { size } = await channel.bulkDelete(toPurge, true)
    deletedCount += size

    // When searching backwards:
    // We reached some point after the specified "after", stop
    // Next fetch would just be after that point and be pointless
    if (
      before &&
      after &&
      filteredMessages.some((message) => !isAfter(message, after))
    ) {
      break
    }

    // We fetched under 100 messages, meaning that there's no more messages left
    if (messages.size < MAX_FETCH_MESSAGES) {
      break
    }
  }

  await interaction.editReply({
    content: `🗑️ Deleted ${deletedCount} message${
      deletedCount === 1 ? '' : 's'
    }...`,
  })
}

/**
 * Create the FetchMessagesOptions to fetch messages, because TS' strict checking
 * doesn't allow for `after: undefined` (defined as `undefined` instead of not being present,
 * which are actually slightly different.)
 * @param after The message ID to purge after
 * @param before The message ID to purge before
 * @returns An object that can be passed as query options to fetch messages
 */
function getFetchOptions(
  after: string | null,
  before: string | null,
): FetchMessagesOptions {
  const fetchOptions: FetchMessagesOptions = {
    limit: MAX_FETCH_MESSAGES,
  }

  if (after) {
    fetchOptions.after = after
  }

  if (before) {
    fetchOptions.before = before
  }

  return fetchOptions
}

/**
 * Options on how to filter messages
 */
interface FilterOptions {
  after?: string | null
  before?: string | null
  content?: string | null
  from?: Mentionable[] | null
  mentions?: Mentionable[] | null
  bots: boolean
  emoji: boolean
  embeds: number
}

type FetchedMessages = Collection<Snowflake, Message>

/**
 * Filter a Collection of messages based on the filter options so we can purge the right ones
 * @param messages The messages to filter
 * @param options How to filter the messages
 * @returns A Collection of messages that passed the filter
 */
function filterMessages(
  messages: FetchedMessages,
  {
    after,
    before,
    content,
    from,
    mentions,
    bots,
    emoji,
    embeds,
  }: FilterOptions,
): FetchedMessages {
  return messages.filter((message) => {
    if (after && !isAfter(message, after)) return false
    if (before && !isBefore(message, before)) return false
    if (content && !hasContent(message, content)) return false
    if (from && !isFrom(message, from)) return false
    if (mentions && !doesMention(message, mentions)) return false
    if (bots && !isBot(message)) return false
    if (emoji && !hasEmoji(message)) return false
    if (embeds && !hasCountEmbeds(message, embeds)) return false
    if (!isDeleteable(message)) return false
    return true
  })
}

type HasTimestamp = { createdTimestamp: number }
/**
 * Comparison function for two messages, sorting by youngest first
 * @param first First message to compare
 * @param second Second message to compare
 * @returns A number showing the comparison result, >0 if first is older than second, <0 if first is newer than second, =0 if they are the same
 */
function youngestFirst<T extends HasTimestamp>(first: T, second: T): number {
  return second.createdTimestamp - first.createdTimestamp
}

function isAfter(message: Message, after: string): boolean {
  return message.id > after
}

function isBefore(message: Message, before: string): boolean {
  return message.id < before
}

function hasContent(message: Message, content: string): boolean {
  return message.content.toLowerCase().includes(content.toLowerCase())
}

function isFrom(message: Message, from: Mentionable[]): boolean {
  const { author, member } = message

  for (const mentionable of from) {
    if (mentionable instanceof User || mentionable instanceof GuildMember) {
      if (author.id === mentionable.id) return true
    } else {
      if (!member) continue
      if (member.roles.cache.has(mentionable.id)) return true
    }
  }

  return false
}

function doesMention(message: Message, mentions: Mentionable[]): boolean {
  for (const mentionable of mentions) {
    if (message.mentions.has(mentionable)) return true
  }

  return false
}

function isBot(message: Message): boolean {
  return message.author.bot
}

function hasEmoji(message: Message): boolean {
  // TODO: regex this
  return message.content.includes('🙏')
}

function hasCountEmbeds(message: Message, embedCount: number): boolean {
  const count = message.embeds.length + message.attachments.size
  return count >= embedCount
}

// 14 Days period in ms
const p14Days = 60 * 60 * 24 * 14

function isDeleteable(message: Message): boolean {
  const tDelta = message.createdTimestamp - Date.now()
  return message.deletable && tDelta < p14Days
}
