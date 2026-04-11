import { GatewayIntentBits } from 'discord.js'
import env from 'env-var'

import { SleetClient } from '../src/index.ts'
import { blacklist } from './command-nesting-mix.ts'
import { echo } from './echo.ts'
import { secretMessageCommand, secretSlashCommand, secretUserCommand } from './guild-locked.ts'
import { activity } from './misc/activity.ts'
import { info } from './misc/info.ts'
import { minesweeper } from './misc/minesweeper.ts'
import { banlog } from './mod/banlog.ts'
import { mute, unmute } from './mod/mute.ts'
import { purge } from './mod/purge.ts'
import { revoke } from './mod/revoke.ts'
import { softban } from './mod/softban.ts'
import { unban } from './mod/unban.ts'
import { unedit } from './mod/unedit.ts'
import { autoreply } from './secret/autoreply.ts'
import { send } from './secret/send.ts'
import {
  autocompleteCommand,
  autocompleteFood,
  eventLogger,
  messageCommand,
  moduleFilter,
  parentModule,
  parentSlashCommand,
  pingCommand,
  readyLogModule,
  slashCommand,
  userCommand,
  userPermissionsCommand,
} from './SleetTests.ts'
import { count_members } from './util/count_members.ts'
import { quote } from './util/quote.ts'
import { restore_embeds } from './util/restore_embeds.ts'

const TOKEN = env.get('TOKEN').required().asString()
const APPLICATION_ID = env.get('APPLICATION_ID').required().asString()

const sleetClient = new SleetClient({
  sleet: {
    token: TOKEN,
    applicationId: APPLICATION_ID,
  },
  client: {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
  },
})

sleetClient.addModules([
  readyLogModule,
  // mod
  mute,
  unmute,
  softban,
  unban,
  purge,
  revoke,
  banlog,
  unedit,

  // misc
  activity,
  info,
  minesweeper,

  // util
  quote,
  count_members,
  restore_embeds,

  // secret
  autoreply,
  send,

  // testing
  echo,
  slashCommand,
  pingCommand,
  autocompleteCommand,
  autocompleteFood,
  messageCommand,
  userCommand,
  userPermissionsCommand,
  blacklist,
  parentModule,
  parentSlashCommand,
  eventLogger,
  moduleFilter,

  secretSlashCommand,
  secretMessageCommand,
  secretUserCommand,
])

await sleetClient.putCommands({
  registerGuildRestrictedCommands: true,
})
await sleetClient.login()
