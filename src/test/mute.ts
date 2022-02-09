import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, GuildMember } from 'discord.js'
import { SlashCommand } from '../commands/SlashCommand.js'
import {
  getBoolean,
  getMembers,
  getString,
} from '../decorators/inject/getters.js'
import { guildOnly } from '../decorators/guards/guildOnly.js'
import { injectParameters } from '../decorators/inject/injectParameters.js'
import { permissions } from '../decorators/guards/permissions.js'

interface MuteFail {
  member: GuildMember
  reason: string
}

const mutedRoles = ['muted', 'mute', 'foreboden', 'roleban', 'rolebanned']

export class MuteCommand extends SlashCommand {
  constructor() {
    const muteBuilder = new SlashCommandBuilder()
      .setName('mute')
      .setDescription('Mutes someone (via timeout lol)')
      .addStringOption((opt) =>
        opt
          .setName('members')
          .setDescription('The members to mute')
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt.setName('reason').setDescription('The reason for the mute'),
      )
      .addBooleanOption((opt) =>
        opt
          .setName('ephemeral')
          .setDescription('Ephemeral mute (default: false)'),
      )

    super(muteBuilder.toJSON())
  }

  @guildOnly()
  @permissions('MANAGE_ROLES')
  @injectParameters()
  async run(
    interaction: CommandInteraction<'present'>,
    @getMembers('members') members: GuildMember[],
    @getString('reason') reason = 'No reason given',
    @getBoolean('ephemeral', false) ephemeral = false,
  ): Promise<unknown> {
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
