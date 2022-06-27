import {
  Channel,
  CommandInteraction,
  Guild,
  GuildBasedChannel,
  GuildMember,
  GuildTextBasedChannel,
  MessageManager,
  Role,
  User,
} from 'discord.js'

/**
 * An error indication there was a problem trying to resolve some data from the interaction,
 * typically because it's impossible to fetch (ie. fetching a member/guild in DMs)
 */
class ResolveDataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ResolveDataError'
  }
}

/**
 * Allows you to parse multiple users from a single string option (because the User option only accepts 1 user)
 * @param interaction The interaction to resolve data for
 * @param name The name of the option to resolve data for
 * @param required Is the option required? If true and missing, an error will be thrown, otherwise null will be returned
 * @returns An array of User objects, or null if the option is not required & missing
 */
export function getUsers(
  interaction: CommandInteraction,
  name: string,
  required: true,
): User[]
export function getUsers(
  interaction: CommandInteraction,
  name: string,
  required?: boolean,
): User[] | null
export function getUsers(
  interaction: CommandInteraction,
  name: string,
  required = false,
): User[] | null {
  const string = interaction.options.getString(name, required)
  if (string === null) return null
  const data = interaction.options.resolved.users

  return data?.toJSON().filter((v) => string.includes(v.id)) ?? []
}

/**
 * Allows you to parse multiple members from a single string option (because the Member option only accepts 1 member)
 * @param interaction The interaction to resolve data for
 * @param name The name of the option to resolve data for
 * @param required Is the option required? If missing, an error will be thrown if true, null will be returned if false
 * @returns An array of GuildMember objects, or null if the option is not required & missing
 */
export function getMembers(
  interaction: CommandInteraction,
  name: string,
  required: true,
): GuildMember[]
export function getMembers(
  interaction: CommandInteraction,
  name: string,
  required?: boolean,
): GuildMember[] | null
export function getMembers(
  interaction: CommandInteraction,
  name: string,
  required = false,
): GuildMember[] | null {
  const string = interaction.options.getString(name, required)
  if (string === null) return null
  const data = interaction.options.resolved.members

  const members = data
    ?.filter((m): m is GuildMember => {
      if (m === null) return false
      if (m instanceof GuildMember) return true
      // TODO: how to resolve APIInteractionDataResolvedGuildMember into a GuildMember???
      return false
    })
    .toJSON()

  return members ?? []
}

/**
 * Get the guild associated with an interaction, fetching it if it's not cached
 * @param interaction The interaction to resolve data for
 * @param required If the guild is required, if the guild is missing, an error will be thrown if true, null will be returned if false
 */
export async function getGuild(
  interaction: CommandInteraction,
  required: true,
): Promise<Guild>
export async function getGuild(
  interaction: CommandInteraction,
  required?: boolean,
): Promise<Guild | null>
export async function getGuild(
  interaction: CommandInteraction,
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
  const member = interaction.options.getMember(name, required)
  if (member === null) return null
  const user = interaction.options.getUser(name, true)

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
  interaction: CommandInteraction,
  name: string,
  required: true,
): Promise<GuildBasedChannel>
export async function getChannel(
  interaction: CommandInteraction,
  name: string,
  required?: boolean,
): Promise<GuildBasedChannel | null>
export async function getChannel(
  interaction: CommandInteraction,
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

  return channel instanceof Channel
    ? channel
    : await guild.channels.fetch(channel.id)
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
  interaction: CommandInteraction,
  name: string,
  required: true,
): Promise<GuildTextBasedChannel>
export async function getTextBasedChannel(
  interaction: CommandInteraction,
  name: string,
  required?: boolean,
): Promise<GuildTextBasedChannel | null>
export async function getTextBasedChannel(
  interaction: CommandInteraction,
  name: string,
  required = false,
): Promise<GuildTextBasedChannel | null> {
  if (!interaction.inGuild()) {
    throw new ResolveDataError(
      'Tried to get a channel, but interaction was not in a guild',
    )
  }

  // TODO: check if this fetched cached threads correctly?
  const channel = interaction.options.getChannel(name, required)
  if (channel === null) return null

  return 'messages' in channel && channel.messages instanceof MessageManager
    ? channel
    : null
}

/**
 * Get a role from an interaction option, fetching them if necessary
 * @param interaction The interaction to resolve data for
 * @param name The name of the options to resolve data for
 * @param required Is the option required? If missing, an error will be thrown if true, null will be returned if false
 */
export async function getRole(
  interaction: CommandInteraction,
  name: string,
  required: true,
): Promise<Role>
export async function getRole(
  interaction: CommandInteraction,
  name: string,
  required?: boolean,
): Promise<Role | null>
export async function getRole(
  interaction: CommandInteraction,
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
  interaction: CommandInteraction,
  name: string,
  required = false,
): Promise<Role[]> {
  if (!interaction.inGuild()) {
    throw new ResolveDataError(
      'Tried to get roles, but interaction was not in a guild',
    )
  }

  const guild = await getGuild(interaction, true)
  const string = interaction.options.getString(name, required)
  if (string === null) return []

  const rolePromises =
    interaction.options.resolved.roles
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

function exists<T>(value: T | null | undefined): value is T {
  return !(value === null || value === undefined)
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
  interaction: CommandInteraction,
  name: string,
  required?: boolean,
): Promise<Mentionable[] | null>
export async function getMentionables(
  interaction: CommandInteraction,
  name: string,
  required: true,
): Promise<Mentionable[]>
export async function getMentionables(
  interaction: CommandInteraction,
  name: string,
  required = false,
): Promise<Mentionable[] | null> {
  const guild = await getGuild(interaction)

  const mentions = interaction.options.getString(name, required)
  if (!mentions) return null

  const users = getUsers(interaction, name) ?? []
  const members = getMembers(interaction, name) ?? []
  const roles = guild !== null ? await getRoles(interaction, name) : []

  const finalUsers = users.filter((u) => members.every((m) => m.id !== u.id))

  return [...finalUsers, ...members, ...roles]
}
