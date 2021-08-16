import { Client, Intents } from 'discord.js'
import { Credentials } from './constants/Credentials'
import SleetClient from './SleetClient'

const client = new Client({
  intents: [Intents.FLAGS.GUILDS],
})

const sleet = new SleetClient(client)

client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`)
})

sleet.login(Credentials.token)
