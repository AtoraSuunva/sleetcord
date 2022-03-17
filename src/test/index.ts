import { Intents } from 'discord.js'
import env from 'env-var'
import { SleetClient } from '../index.js'
import { slashCommand, messageCommand, userCommand } from './SleetTests.js'
import { echo } from './echo.js'
import { mute } from './mute.js'

const TOKEN = env.get('TOKEN').required().asString()
const APPLICATION_ID = env.get('APPLICATION_ID').required().asString()
const TEST_GUILD_ID = env.get('TEST_GUILD_ID').required().asString()

const sleetClient = new SleetClient({
  sleet: {
    token: TOKEN,
    applicationId: APPLICATION_ID,
  },
  client: {
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
  },
})

sleetClient.addModules([mute, echo, slashCommand, messageCommand, userCommand])
sleetClient.putCommands({ guildId: TEST_GUILD_ID })
sleetClient.login()
