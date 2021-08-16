import { ApplicationCommandOptionType } from 'discord-api-types'
import { SlashCommand } from '../CommandBuilder'

export default new SlashCommand('echo', 'Echoes your text')
  .addOption(
    'message',
    'The message to echo',
    ApplicationCommandOptionType.String,
    true,
  )
  .addOption(
    'uppercase',
    'Make the message uppercase',
    ApplicationCommandOptionType.Boolean,
  )
  .onInteractionCreate((interaction) => {
    const message = interaction.options.getString('message', true)
    const uppercase = interaction.options.getBoolean('uppercase') || false

    interaction.reply(uppercase ? message.toUpperCase() : message)
  })
