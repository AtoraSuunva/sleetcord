import {
  Channel,
  CommandInteraction,
  Guild,
  GuildBasedChannel,
  GuildMember,
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

  return (
    data
      ?.toJSON()
      .filter(
        (v): v is GuildMember =>
          v instanceof GuildMember && string.includes(v.id),
      ) ?? []
  )
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
    interaction.guild ||
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
