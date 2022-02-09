import { Intents } from 'discord.js'
import env from 'env-var'
import { SleetClient } from '../index.js'
import { CalculatorCommand } from './calculator.js'
import { EchoCommand } from './echo.js'
import { MuteCommand } from './mute.js'

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
const muteCommand = new MuteCommand()
const calculatorCommand = new CalculatorCommand()

sleetClient.addCommands([echoCommand, muteCommand, calculatorCommand])
// sleetClient.putCommands({ guildId: TEST_GUILD_ID })
sleetClient.login()
