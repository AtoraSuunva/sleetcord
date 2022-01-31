import { Client, Intents } from 'discord.js'
import { Credentials } from './constants/Credentials'
import SleetClient from './SleetClient'

import echo from './commands/examples/Echo'
import kick from './commands/examples/Kick'
import ping from './commands/examples/Ping'
import register from './commands/examples/Register'

import egg from './commands/examples/Egg'

const client = new Client({
  intents: [Intents.FLAGS.GUILDS],
})

const sleet = new SleetClient(client, {
  commands: [echo, kick, ping, register, egg],
})

client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`)
})

sleet.login(Credentials.token)
