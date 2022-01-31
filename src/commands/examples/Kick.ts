import {
  APIInteractionGuildMember,
  ApplicationCommandOptionType,
} from 'discord-api-types/payloads/v9'
import { Guild, GuildMember, User } from 'discord.js'
import { SlashCommand } from '../builders/SlashCommand'

async function makeMember(
  guild: Guild,
  member: GuildMember | APIInteractionGuildMember,
): Promise<GuildMember> {
  return member instanceof GuildMember
    ? member
    : await guild.members.fetch(member.user.id)
}

export default new SlashCommand<{
  user: User
  reason?: string
}>({
  name: 'kick',
  description: 'Kicks a user',
})
  .addOption({
    name: 'user',
    description: 'The user to kick',
    type: ApplicationCommandOptionType.User,
    required: true,
  })
  .addOption({
    name: 'reason',
    description: 'The reason to kick',
    type: ApplicationCommandOptionType.String,
  })
  .onInteractionCreate(async (interaction, params) => {
    const { user, reason } = params

    if (!interaction.inGuild() || interaction.guild === null) {
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

    // await interaction.guild?.members.kick(user, reason)

    interaction.reply(
      `Kicked ${user.tag} from the server${reason ? `for "${reason}"` : ''}`,
    )
  })
