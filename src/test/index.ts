import { Intents } from 'discord.js'
import env from 'env-var'
import { SleetClient } from '../SleetClient.js'
import { EchoCommand } from './echo.js'

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

const echoCommand = new EchoCommand()
sleetClient.addCommands([echoCommand])
// sleetClient.putCommands({ guildId: TEST_GUILD_ID })
sleetClient.login()
