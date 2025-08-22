import {
    ApplicationCommandOptionType,
    ChatInputCommandInteraction,
    Guild,
    User,
} from 'discord.js'
import {
    botHasPermissionsGuard,
    formatUser,
    getGuild,
    getUsers,
    inGuildGuard,
    SleetSlashCommand,
} from '../../src/index.js'

export const unban = new SleetSlashCommand(
  {
    name: 'unban',
    description: 'Unbans a user',
    default_member_permissions: ['BanMembers'],
    dm_permission: false,
    options: [
      {
        name: 'users',
        type: ApplicationCommandOptionType.String,
        description: 'The users to unban',
        required: true,
      },
      {
        name: 'reason',
        type: ApplicationCommandOptionType.String,
        description: 'The reason for the unban (default: none)',
      },
      {
        name: 'ephemeral',
        type: ApplicationCommandOptionType.Boolean,
        description: 'Ephemeral unban (default: false)',
      },
    ],
  },
  {
    run: runUnban,
  },
)

interface UnbanSucess {
  user: User
}

interface UnbanFail extends UnbanSucess {
  reason: string
}

async function runUnban(interaction: ChatInputCommandInteraction) {
  inGuildGuard(interaction)
  await botHasPermissionsGuard(interaction, ['BanMembers'])

  const guild = await getGuild(interaction, true)
  const users = await getUsers(interaction, 'users', true)
  const reason = interaction.options.getString('reason') || 'No reason given'
  const formattedReason = `Unban by ${interaction.user.tag} for: ${reason}`
  const ephemeral = interaction.options.getBoolean('ephemeral') || false

  if (users.length === 0) {
    return interaction.reply({
      ephemeral: true,
      content: 'No users to unban found.',
    })
  }

  const deferReply = interaction.deferReply({ ephemeral })
  const result = await unbanUsers(guild, users, formattedReason)

  await deferReply
  return interaction.editReply({
    content: formatUnbanResult(result),
  })
}

interface UnbanResult {
  succeeded: UnbanSucess[]
  failed: UnbanFail[]
}

async function unbanUsers(
  guild: Guild,
  users: User[],
  reason: string,
): Promise<UnbanResult> {
  const succeeded: UnbanSucess[] = []
  const failed: UnbanFail[] = []

  await Promise.all(
    users.map(async (user) => {
      try {
        await guild.members.unban(user, reason)
        succeeded.push({ user })
      } catch (e) {
        failed.push({
          user,
          reason: e instanceof Error ? e.message : String(e),
        })
      }
    }),
  )

  return { succeeded, failed }
}

function formatUnbanResult({ succeeded, failed }: UnbanResult): string {
  const succ =
    succeeded.length > 0 ? `\n${formatSuccesses(succeeded)}` : ' Nobody!'
  const fail = failed.length > 0 ? `\n**Failed:**\n${formatFails(failed)}` : ''

  return `**Unbanned**${succ}${fail}`
}

function formatSuccesses(success: UnbanSucess[]): string {
  return success.map((succ) => `> ${formatUser(succ.user)}`).join('\n')
}

function formatFails(failed: UnbanFail[]): string {
  return failed
    .map((fail) => `> ${formatUser(fail.user)} - ${fail.reason}`)
    .join('\n')
}
