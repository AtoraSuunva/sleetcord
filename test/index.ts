import { GatewayIntentBits } from 'discord.js'
import env from 'env-var'
import { SleetClient } from '../src/index.js'
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
} from './SleetTests.js'
import { blacklist } from './command-nesting-mix.js'
import { echo } from './echo.js'
import {
  secretMessageCommand,
  secretSlashCommand,
  secretUserCommand,
} from './guild-locked.js'
import { activity } from './misc/activity.js'
import { furrygen } from './misc/furrygen.js'
import { info } from './misc/info.js'
import { minesweeper } from './misc/minesweeper.js'
import { stats } from './misc/stats.js'
import { banlog } from './mod/banlog.js'
import { mute, unmute } from './mod/mute.js'
import { purge } from './mod/purge.js'
import { revoke } from './mod/revoke.js'
import { softban } from './mod/softban.js'
import { unban } from './mod/unban.js'
import { unedit } from './mod/unedit.js'
import { autoreply } from './secret/autoreply.js'
import { send } from './secret/send.js'
import { count_members } from './util/count_members.js'
import { quote } from './util/quote.js'
import { restore_embeds } from './util/restore_embeds.js'

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
  furrygen,
  info,
  stats,
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
