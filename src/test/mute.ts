import { ApplicationCommandOptionType } from 'discord-api-types/v10'
import { CommandInteraction, GuildMember } from 'discord.js'
import { inGuild } from '../guards/index.js'
import { SleetSlashCommand } from '../modules/slash/SleetSlashCommand.js'
import { getMembers } from '../parsers/resolvedData.js'

interface MuteFail {
  member: GuildMember
  reason: string
}

const mutedRoles = ['muted', 'mute', 'foreboden', 'roleban', 'rolebanned']

export const mute = new SleetSlashCommand(
  {
    name: 'mute',
    description: 'Mutes a user',
    default_member_permissions: ['MANAGE_ROLES'],
    dm_permission: false,
    options: [
      {
        name: 'members',
        type: ApplicationCommandOptionType.String,
        description: 'The members to mute',
        required: true,
      },
      {
        name: 'reason',
        type: ApplicationCommandOptionType.String,
        description: 'The reason for the mute',
      },
      {
        name: 'ephemeral',
        type: ApplicationCommandOptionType.Boolean,
        description: 'Ephemeral mute (default: false)',
      },
    ],
  },
  {
    run: runMute,
  },
)

async function runMute(interaction: CommandInteraction): Promise<unknown> {
  inGuild(interaction)

  const members = getMembers(interaction, 'members', true)
  const reason = interaction.options.getString('reason')
  const ephemeral = interaction.options.getBoolean('ephemeral') ?? false

  await interaction.deferReply({ ephemeral })

  const member = interaction.member as GuildMember
  const userHighestRole = member.roles.highest
  const myHighestRole = member.guild.me?.roles.highest
  const mutedRole = member.guild.roles.cache.find((r) =>
    mutedRoles.includes(r.name.toLowerCase()),
  )

  if (!myHighestRole) {
    return interaction.editReply('Somehow I am not cached in this guild')
  }

  if (!mutedRole) {
    return interaction.editReply(
      `No muted role found, set up a role with one of the following names: \`${mutedRoles.join(
        '`, `',
      )}\``,
    )
  }

  const toMute: GuildMember[] = []
  const failed: MuteFail[] = []

  for (const member of members) {
    if (member.id === interaction.client.user?.id) {
      failed.push({ member, reason: 'This is me.' })
    } else if (member.id === interaction.user.id) {
      failed.push({ member, reason: 'You cannot mute yourself.' })
    } else if (member.roles.highest.position >= userHighestRole.position) {
      failed.push({
        member,
        reason: 'You cannot mute someone with a higher or equal role to you.',
      })
    } else if (member.roles.highest.position >= myHighestRole.position) {
      failed.push({
        member,
        reason: 'I cannot mute someone with a higher or equal role to me.',
      })
    } else {
      toMute.push(member)
    }
  }

  if (toMute.length === 0) {
    return interaction.editReply(
      `No valid users to mute.\n${formatFails(failed)}`,
    )
  }

  const succeeded: GuildMember[] = []
  const formattedReason = `Mute by ${member.displayName} for "${reason}"`

  const actions = toMute.map((member) =>
    member.roles
      .add(mutedRole, formattedReason)
      .then(() => succeeded.push(member))
      .catch((e) => failed.push({ member, reason: e })),
  )

  await Promise.all(actions)

  const succ =
    succeeded.length > 0 ? `\n${formatSuccesses(succeeded)}` : ' nobody'
  const fail = failed.length > 0 ? `\nFailed:\n${formatFails(failed)}` : ''

  return interaction.editReply(`Muted:${succ}${fail}`)
}

function formatSuccesses(succeeded: GuildMember[]) {
  return (
    succeeded.map((member) => `> ${member.user.tag}`).join('\n') || 'nobody'
  )
}

function formatFails(failed: MuteFail[]) {
  return failed
    .map((fail) => `> ${fail.member.user.tag} - ${fail.reason}`)
    .join('\n')
}
