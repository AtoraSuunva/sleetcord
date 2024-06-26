import { OAuth2Scopes } from 'discord-api-types/v10'
import { ClientUser, Message } from 'discord.js'
import { SleetModule } from '../../src/index.js'

export const autoreply = new SleetModule(
  {
    name: 'autoreply',
  },
  {
    messageCreate: handleMessageCreate,
  },
)

const thanksRegex = /thanks?\s*(u|you)?\s*(,\s*)?smol(bot)?/i

let clientUserRegex: RegExp | null = null

async function handleMessageCreate(message: Message) {
  if (message.author.bot) return

  if (thanksRegex.test(message.content)) {
    return message.reply({
      content: 'np',
      allowedMentions: { parse: [], repliedUser: false },
    })
  }

  const { client } = message
  const { user } = client

  if (user) {
    const userRegex = lazyInitClientUserRegex(user)
    const inviteLink = client.generateInvite({
      scopes: client.application?.installParams?.scopes ?? [
        OAuth2Scopes.Bot,
        OAuth2Scopes.ApplicationsCommands,
      ],
    })

    if (userRegex.test(message.content)) {
      await message.reply({
        content: `Use slash commands to interact with me, type \`/\` into your chat bar to see them.\nDon't see them? Try kicking me and reinviting me. ${inviteLink}`,
      })
    }
  }

  return
}

function lazyInitClientUserRegex(user: ClientUser): RegExp {
  return (clientUserRegex ??= new RegExp(`^<@!?${user.id}>$`))
}
