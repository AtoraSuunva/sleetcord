import {
  BaseInteraction,
  ChatInputCommandInteraction,
  Client,
  CommandInteraction,
  Guild,
  GuildBasedChannel,
  GuildMember,
  GuildTextBasedChannel,
  Role,
  User,
} from 'discord.js'
import { PreRunError } from '../errors/PreRunError.js'
import { exists } from '../utils/funcs.js'

/**
 * An error indication there was a problem trying to resolve some data from the interaction,
 * typically because it's impossible to fetch (ie. fetching a member/guild in DMs)
 */
class ResolveDataError extends PreRunError {
  constructor(message: string) {
    super(message)
    this.name = 'ResolveDataError'
  }
}

/** ID regex but "bounded" to string start/end or whitespace, to get IDs not in <@id> format */
const idRegexBounded = /(?:^|\s)(?<id>\d{16,19})(?:\s|$)/g
/** ID regex that only matches if the entire string from start to end is likely an ID */
const idRegexFull = /^\d{16,19}$/

/**
 * Check a string to see if it's a string of 16-19 digits, meaning it *might* be a Discord ID
 *
 * You will need to check with Discord to see if it's a real ID, but it'll at least be in the right format
 * @param str To string to check if it's an ID
 * @returns If the string is *likely* an ID
 */
export const isLikelyID = (str: string): boolean => idRegexFull.test(str)

/**
 * Check a string to see if there's any string of 16-19 digits, meaning it *might* be a Discord ID
 *
 * You will need to check with Discord to see if it's a real ID, but it'll at least be in the right format
 *
 * IDs are only matched if they're bounded by whitespace or the string start/end, so:
 *
 * ```js
 * getAllIds('74768773940256768 <@205164225625194496> 200723772427337729asdsa')
 * // Returns ['74768773940256768']
 * ```
 * @param str To string to check for potential IDs
 * @returns All potential IDs in the string
 */
export const getAllIDs = (str: string): string[] =>
  Array.from(str.matchAll(idRegexBounded), (m) => m.groups?.id).filter(exists)

/**
 * Allows you to parse multiple users from a single string option (because the User option only accepts 1 user)
 *
 * Accepts user mentions (parsed from resolved data) or user IDs (fetched from Discord)
 * @param interaction The interaction to resolve data for
 * @param name The name of the option to resolve data for
 * @param required Is the option required? If true and missing, an error will be thrown, otherwise null will be returned
 * @returns An array of User objects, or null if the option is not required & missing
 */
export async function getUsers(
  interaction: ChatInputCommandInteraction,
  name: string,
  required: true,
): Promise<User[]>
export async function getUsers(
  interaction: ChatInputCommandInteraction,
  name: string,
  required?: boolean,
): Promise<User[] | null>
export async function getUsers(
  interaction: ChatInputCommandInteraction,
  name: string,
  required = false,
): Promise<User[] | null> {
  const string = interaction.options.getString(name, required)
  if (string === null) return null

  const ids = getAllIDs(string)
  const resolvedIDUsers = await Promise.all(
    ids.map((uid) => tryFetchUser(interaction.client, uid)),
  ).then((res) => res.filter(exists))

  const data = interaction.options.resolved?.users
  const resolvedDataUsers =
    data?.toJSON().filter((v) => string.includes(v.id)) ?? []

  return [...resolvedIDUsers, ...resolvedDataUsers]
}

/**
 * Allows you to parse multiple members from a single string option (because the Member option only accepts 1 member)
 *
 * Accepts user mentions (parsed from resolved data) or user IDs (fetched from Discord)
 * @param interaction The interaction to resolve data for
 * @param name The name of the option to resolve data for
 * @param required Is the option required? If missing, an error will be thrown if true, null will be returned if false
 * @returns An array of GuildMember objects, or null if the option is not required & missing
 */
export async function getMembers(
  interaction: ChatInputCommandInteraction,
  name: string,
  required: true,
): Promise<GuildMember[]>
export async function getMembers(
  interaction: ChatInputCommandInteraction,
  name: string,
  required?: boolean,
): Promise<GuildMember[] | null>
export async function getMembers(
  interaction: ChatInputCommandInteraction,
  name: string,
  required = false,
): Promise<GuildMember[] | null> {
  const string = interaction.options.getString(name, required)
  if (string === null) return null

  const guild = await getGuild(interaction, true)
  const ids = getAllIDs(string)
  const resolvedIDMembers = await Promise.all(
    ids.map((uid) => tryFetchMember(guild, uid)),
  ).then((res) => res.filter(exists))

  const data = interaction.options.resolved?.members
  const resolvedDataMembers =
    data
      ?.filter((m): m is GuildMember => {
        if (m === null) return false
        if (m instanceof GuildMember) return true
        // TODO: how to resolve APIInteractionDataResolvedGuildMember into a GuildMember???
        return false
      })
      .toJSON() ?? []

  return [...resolvedIDMembers, ...resolvedDataMembers]
}

/**
 * Try to fetch a user from a "possible" user ID
 * @param client The client to fetch data from
 * @param uid The (potential) ID of the user to fetch
 * @returns The user if successfully fetched, otherwise null if an error occured or the user doesn't exist
 */
export async function tryFetchUser(
  client: Client,
  uid: string,
): Promise<User | null> {
  try {
    return await client.users.fetch(uid)
  } catch {
    return null
  }
}

/**
 * Try to fetch a member from a "possible" user ID and guild
 * @param guild The guild to fetch data from
 * @param uid The (potential) ID of the member to fetch
 * @returns The member if successfully fetched, otherwise null if an error occured or there's no member with that ID in the guild
 */
export async function tryFetchMember(
  guild: Guild,
  uid: string,
): Promise<GuildMember | null> {
  try {
    return await guild.members.fetch(uid)
  } catch {
    return null
  }
}

/**
 * Get the guild associated with an interaction, fetching it if it's not cached
 * @param interaction The interaction to resolve data for
 * @param required If the guild is required, if the guild is missing, an error will be thrown if true, null will be returned if false
 */
export async function getGuild(
  interaction: BaseInteraction,
  required: true,
): Promise<Guild>
export async function getGuild(
  interaction: BaseInteraction,
  required?: boolean,
): Promise<Guild | null>
export async function getGuild(
  interaction: BaseInteraction,
  required = false,
): Promise<Guild | null> {
  if (!interaction.inGuild()) {
    if (required)
      throw new ResolveDataError(
        'Tried to get a guild, but interaction was not in a guild',
      )
    return null
  }

  return (
    interaction.guild ??
    (await interaction.client.guilds.fetch(interaction.guildId))
  )
}

/**
 * Get a user from an interaction option
 *
 * User is always available from an interaction, so this only serves as a alias to `interaction.options.getUser`
 * @param interaction The interaction to resolve data for
 * @param name The name of the options to resolve data for
 * @param required Is the option required? If missing, an error will be thrown if true, null will be returned if false
 */
export async function getUser(
  interaction: CommandInteraction,
  name: string,
  required: true,
): Promise<User>
export async function getUser(
  interaction: CommandInteraction,
  name: string,
  required?: boolean,
): Promise<User | null>
export async function getUser(
  interaction: CommandInteraction,
  name: string,
  required = false,
): Promise<User | null> {
  return interaction.options.getUser(name, required)
}

/**
 * Get a member from an interaction option, fetching them if necessary
 * @param interaction The interaction to resolve data for
 * @param name The name of the options to resolve data for
 * @param required Is the option required? If missing, an error will be thrown if true, null will be returned if false
 */
export async function getMember(
  interaction: CommandInteraction,
  name: string,
  required: true,
): Promise<GuildMember>
export async function getMember(
  interaction: CommandInteraction,
  name: string,
  required?: boolean,
): Promise<GuildMember | null>
export async function getMember(
  interaction: CommandInteraction,
  name: string,
  required = false,
): Promise<GuildMember | null> {
  if (!interaction.inGuild()) {
    throw new ResolveDataError(
      'Tried to get a member, but interaction was not in a guild',
    )
  }

  const guild = await getGuild(interaction, true)
  const member = interaction.options.getMember(name)
  if (member === null) return null
  const user = interaction.options.getUser(name, required)

  if (user === null) return null

  return member instanceof GuildMember
    ? member
    : await guild.members.fetch(user)
}

/**
 * Get a channel from an interaction option, fetching them if necessary
 * @param interaction The interaction to resolve data for
 * @param name The name of the options to resolve data for
 * @param required Is the option required? If missing, an error will be thrown if true, null will be returned if false
 */
export async function getChannel(
  interaction: ChatInputCommandInteraction,
  name: string,
  required: true,
): Promise<GuildBasedChannel>
export async function getChannel(
  interaction: ChatInputCommandInteraction,
  name: string,
  required?: boolean,
): Promise<GuildBasedChannel | null>
export async function getChannel(
  interaction: ChatInputCommandInteraction,
  name: string,
  required = false,
): Promise<GuildBasedChannel | null> {
  if (!interaction.inGuild()) {
    throw new ResolveDataError(
      'Tried to get a channel, but interaction was not in a guild',
    )
  }

  const guild = await getGuild(interaction, true)
  const channel = interaction.options.getChannel(name, required)
  if (channel === null) return null

  return 'guild' in channel ? channel : await guild.channels.fetch(channel.id)
}

/**
 * Get a TextBasedChannel from an interaction option, fetching them if necessary
 *
 * Returns null if no channel was provided or it's not a text-based channel
 * @param interaction The interaction to resolve data for
 * @param name The name of the options to resolve data for
 * @param required Is the option required? If missing, an error will be thrown if true, null will be returned if false
 */
export async function getTextBasedChannel(
  interaction: ChatInputCommandInteraction,
  name: string,
  required: true,
): Promise<GuildTextBasedChannel>
export async function getTextBasedChannel(
  interaction: ChatInputCommandInteraction,
  name: string,
  required?: boolean,
): Promise<GuildTextBasedChannel | null>
export async function getTextBasedChannel(
  interaction: ChatInputCommandInteraction,
  name: string,
  required = false,
): Promise<GuildTextBasedChannel | null> {
  if (!interaction.inGuild()) {
    throw new ResolveDataError(
      'Tried to get a channel, but interaction was not in a guild',
    )
  }

  // TODO: check if this fetched cached threads correctly?
  let channel = interaction.options.getChannel(name, required)

  // We got APIInteractionDataResolvedChannel 😔
  if (channel && !('guild' in channel)) {
    const guild = await getGuild(interaction, true)
    channel = await guild.channels.fetch(channel.id)
  }

  if (channel === null) return null

  if ('messages' in channel && channel.isTextBased()) {
    return channel
  }

  throw new ResolveDataError(
    `Channel "${channel.name}" provided for "${name}" is not a text channel.`,
  )
}

/**
 * Get a role from an interaction option, fetching them if necessary
 * @param interaction The interaction to resolve data for
 * @param name The name of the options to resolve data for
 * @param required Is the option required? If missing, an error will be thrown if true, null will be returned if false
 */
export async function getRole(
  interaction: ChatInputCommandInteraction,
  name: string,
  required: true,
): Promise<Role>
export async function getRole(
  interaction: ChatInputCommandInteraction,
  name: string,
  required?: boolean,
): Promise<Role | null>
export async function getRole(
  interaction: ChatInputCommandInteraction,
  name: string,
  required = false,
): Promise<Role | null> {
  if (!interaction.inGuild()) {
    throw new ResolveDataError(
      'Tried to get a role, but interaction was not in a guild',
    )
  }

  const guild = await getGuild(interaction, true)
  const role = interaction.options.getRole(name, required)
  if (role === null) return null

  return role instanceof Role ? role : await guild.roles.fetch(role.id)
}

/**
 * Get all roles from an interaction option, fetching them if necessary
 *
 * The option should be a string, and then the role mentions in the string are extracted
 * @param interaction The interaction to resolve data for
 * @param name The name of the options to resolve data for
 * @param required Is the option required? If missing, an error will be thrown if true, null will be returned if false
 */
export async function getRoles(
  interaction: ChatInputCommandInteraction,
  name: string,
  required: true,
): Promise<Role[]>
export async function getRoles(
  interaction: ChatInputCommandInteraction,
  name: string,
  required?: boolean,
): Promise<Role[] | null>
export async function getRoles(
  interaction: ChatInputCommandInteraction,
  name: string,
  required = false,
): Promise<Role[] | null> {
  if (!interaction.inGuild()) {
    throw new ResolveDataError(
      'Tried to get roles, but interaction was not in a guild',
    )
  }

  const guild = await getGuild(interaction, true)
  const string = interaction.options.getString(name, required)
  if (string === null) return null

  const rolePromises =
    interaction.options.resolved?.roles
      ?.filter((role) => {
        if (role === null || !string.includes(`<@&${role.id}>`)) return false
        return true
      })
      .map((role) => {
        if (role instanceof Role) return role
        return guild.roles.fetch(role.id)
      }) ?? []

  return (await Promise.all(rolePromises)).filter(exists)
}

/**
 * Represents some "mentionable" item that sends a ping (User or Role pings)
 */
export type Mentionable = User | GuildMember | Role

/**
 * Get all "mentionable" (user & role pings) items in an options
 *
 * Users are resolved into GuildMembers if possible
 * @param interaction The interaction to resolve data for
 * @param name The name of the option to resolve data for
 * @returns An array of all the mentionables found in that option
 */
export async function getMentionables(
  interaction: ChatInputCommandInteraction,
  name: string,
  required?: boolean,
): Promise<Mentionable[] | null>
export async function getMentionables(
  interaction: ChatInputCommandInteraction,
  name: string,
  required: true,
): Promise<Mentionable[]>
export async function getMentionables(
  interaction: ChatInputCommandInteraction,
  name: string,
  required = false,
): Promise<Mentionable[] | null> {
  const guild = await getGuild(interaction)

  const mentions = interaction.options.getString(name, required)
  if (!mentions) return null

  const users = (await getUsers(interaction, name, required)) ?? []
  const members = (await getMembers(interaction, name, required)) ?? []
  const roles =
    guild !== null ? (await getRoles(interaction, name, required)) ?? [] : []

  const finalUsers = users.filter((u) => members.every((m) => m.id !== u.id))

  return [...finalUsers, ...members, ...roles]
}
