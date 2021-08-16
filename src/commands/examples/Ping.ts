import { SlashCommand } from '../CommandBuilder'

export default new SlashCommand(
  'ping',
  'Replies with pong',
).onInteractionCreate((interaction) => interaction.reply('Pong! But cooler!'))
