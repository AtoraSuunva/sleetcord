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

export const getParam =
  (name: string, required: boolean, type: ParamType, getter: GetOption) =>
  (target: Record<string, unknown>, _key: string, index: number) => {
    Reflect.defineMetadata(
      `get:${name}`,
      { name, index, required, type, getter } as GetMetadata,
      target,
    )
  }

export const getString = (name: string, required = true) =>
  getParam(name, required, 'string', getOption)

export const getBoolean = (name: string, required = true) =>
  getParam(name, required, 'boolean', getOption)

export const getChannel = (name: string, required = true) =>
  getParam(name, required, 'channel', getOption)

export const getInteger = (name: string, required = true) =>
  getParam(name, required, 'integer', getOption)

export const getMember = (name: string, required = true) =>
  getParam(name, required, 'member', getOption)

export const getMentionable = (name: string, required = true) =>
  getParam(name, required, 'mentionable', getOption)

export const getNumber = (name: string, required = true) =>
  getParam(name, required, 'number', getOption)

export const getRole = (name: string, required = true) =>
  getParam(name, required, 'role', getOption)

export const getUser = (name: string, required = true) =>
  getParam(name, required, 'user', getOption)

export const getUsers = (name: string, required = true) =>
  getParam(name, required, 'users', getUsersHelper)

export const getMembers = (name: string, required = true) =>
  getParam(name, required, 'members', getMembersHelper)

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

function getUsersHelper(
  interaction: CommandInteraction,
  name: string,
  required: boolean,
): User[] | null {
  const string = interaction.options.getString(name, required)
  const users = interaction.options.resolved.users
  if (string === null || users === undefined) return null

  return Array.from(users.filter((user) => string.includes(user.id)).values())
}

function getMembersHelper(
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
