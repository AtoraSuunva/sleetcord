import { APIInteractionDataResolvedGuildMember } from 'discord-api-types'
import { Client, ContextMenuInteraction, Guild, GuildMember } from 'discord.js'
import { commands } from '../commands/Commands'
import { UserInteractionCommand } from '../commands/CommandTypes'
import { ApplicationCommandTypes } from '../constants/ApplicationCommandTypes'

function makeMember(
  client: Client<boolean>,
  member: GuildMember | APIInteractionDataResolvedGuildMember,
  guild: Guild,
): GuildMember {
  return member instanceof GuildMember
    ? member
    : new GuildMember(client, member, guild)
}

function getUserCommand(name: string): UserInteractionCommand | null {
  const command = commands.find(
    (c) => c.name === name && c.type === ApplicationCommandTypes.USER,
  )

  if (command && command.type === ApplicationCommandTypes.USER) {
    return command
  } else {
    return null
  }
}

export function handleUserInteraction(
  interaction: ContextMenuInteraction,
): void {
  console.log(
    'Handling message interaction',
    interaction.commandName,
    'args',
    interaction.options.data,
  )

  const command = getUserCommand(interaction.commandName)

  if (command) {
    const user = interaction.options.getUser('user', true)

    const member = interaction.guild
      ? makeMember(
          interaction.client,
          interaction.options.getMember('user', true),
          interaction.guild,
        )
      : null

    command.run(interaction, { member, user })
  }
}
