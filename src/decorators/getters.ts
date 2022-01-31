import { CommandInteraction, GuildMember, User } from 'discord.js'

export type ParamType =
  | 'boolean'
  | 'channel'
  | 'integer'
  | 'member'
  | 'mentionable'
  | 'number'
  | 'role'
  | 'string'
  | 'user'
  // Custom
  | 'users'
  | 'members'

type GetOption = (
  interaction: CommandInteraction,
  name: string,
  required: boolean,
  type: ParamType,
) => unknown

export interface GetMetadata {
  name: string
  index: number
  required: boolean
  type: ParamType
  getter: GetOption
}

export const GetParam =
  (name: string, required: boolean, type: ParamType, getter: GetOption) =>
  (target: Record<string, unknown>, _key: string, index: number) => {
    Reflect.defineMetadata(
      `get:${name}`,
      { name, index, required, type, getter } as GetMetadata,
      target,
    )
  }

export const GetString = (name: string, required = true) =>
  GetParam(name, required, 'string', getOption)

export const GetBoolean = (name: string, required = true) =>
  GetParam(name, required, 'boolean', getOption)

export const GetChannel = (name: string, required = true) =>
  GetParam(name, required, 'channel', getOption)

export const GetInteger = (name: string, required = true) =>
  GetParam(name, required, 'integer', getOption)

export const GetMember = (name: string, required = true) =>
  GetParam(name, required, 'member', getOption)

export const GetMentionable = (name: string, required = true) =>
  GetParam(name, required, 'mentionable', getOption)

export const GetNumber = (name: string, required = true) =>
  GetParam(name, required, 'number', getOption)

export const GetRole = (name: string, required = true) =>
  GetParam(name, required, 'role', getOption)

export const GetUser = (name: string, required = true) =>
  GetParam(name, required, 'user', getOption)

export const GetUsers = (name: string, required = true) =>
  GetParam(name, required, 'users', getUsers)

export const GetMembers = (name: string, required = true) =>
  GetParam(name, required, 'users', getMembers)

function getOption(
  interaction: CommandInteraction,
  name: string,
  required: boolean,
  type: ParamType,
): unknown {
  switch (type) {
    case 'boolean':
      return interaction.options.getBoolean(name, required)
    case 'channel':
      return interaction.options.getChannel(name, required)
    case 'integer':
      return interaction.options.getInteger(name, required)
    case 'member':
      return interaction.options.getMember(name, required)
    case 'mentionable':
      return interaction.options.getMentionable(name, required)
    case 'number':
      return interaction.options.getNumber(name, required)
    case 'role':
      return interaction.options.getRole(name, required)
    case 'string':
      return interaction.options.getString(name, required)
    case 'user':
      return interaction.options.getUser(name, required)

    default:
      throw new Error(`Unknown type "${type}"`)
  }
}

function getUsers(
  interaction: CommandInteraction,
  name: string,
  required: boolean,
): User[] | null {
  const string = interaction.options.getString(name, required)
  const users = interaction.options.resolved.users
  if (string === null || users === undefined) return null

  return Array.from(users.filter((user) => string.includes(user.id)).values())
}

function getMembers(
  interaction: CommandInteraction,
  name: string,
  required: boolean,
): GuildMember[] | null {
  const string = interaction.options.getString(name, required)
  const members = interaction.options.resolved.members
  if (string === null || members === undefined) return null

  return Array.from(
    members
      .filter(
        (m): m is GuildMember =>
          m instanceof GuildMember && string.includes(m.id),
      )
      .values(),
  )
}
