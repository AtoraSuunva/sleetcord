import { CommandInteraction, GuildMember, User } from 'discord.js'

export function getUsers(
  interaction: CommandInteraction,
  name: string,
  required = false,
): User[] {
  const string = interaction.options.getString(name, required)
  if (string === undefined || string === null) return []
  const data = interaction.options.resolved.users

  return data?.toJSON().filter((v) => string.includes(v.id)) ?? []
}

export function getMembers(
  interaction: CommandInteraction,
  name: string,
  required = false,
): GuildMember[] {
  const string = interaction.options.getString(name, required)
  if (string === undefined || string === null) return []
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
