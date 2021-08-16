import {
  APIInteractionGuildMember,
  ApplicationCommandOptionType,
} from 'discord-api-types'
import { Guild, GuildMember } from 'discord.js'
import { SlashCommand } from '../CommandBuilder'

async function makeMember(
  guild: Guild,
  member: GuildMember | APIInteractionGuildMember,
): Promise<GuildMember> {
  return member instanceof GuildMember
    ? member
    : await guild.members.fetch(member.user.id)
}

export default new SlashCommand('kick', 'Kicks a user')
  .addOption(
    'user',
    'The user to kick',
    ApplicationCommandOptionType.User,
    true,
  )
  .addOption(
    'reason',
    'The reason to kick',
    ApplicationCommandOptionType.String,
  )
  .onInteractionCreate(async (interaction) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: 'I can only kick people in a server',
        ephemeral: true,
      })
    }

    const member = await makeMember(interaction.guild, interaction.member)

    if (!member.permissions.has('KICK_MEMBERS')) {
      return interaction.reply({
        content: 'You need permissions to kick members to do this',
        ephemeral: true,
      })
    }

    if (!interaction.guild?.me?.permissions.has('KICK_MEMBERS')) {
      return interaction.reply({
        content: "I can't kick members",
        ephemeral: true,
      })
    }

    const user = interaction.options.getUser('user', true)
    const reason = interaction.options.getString('reason') ?? undefined

    await interaction.guild?.members.kick(user, reason)

    interaction.reply(
      `Kicked ${user.tag} from the server${reason ? `for "${reason}"` : ''}`,
    )
  })
