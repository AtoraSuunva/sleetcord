import { SlashCommand } from '../builders/SlashCommand'

export default new SlashCommand({
  name: 'ping',
  description: 'Replies with pong',
}).onInteractionCreate((interaction) => interaction.reply('Pong! But cooler!'))
