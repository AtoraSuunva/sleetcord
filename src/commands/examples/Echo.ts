import { ApplicationCommandOptionType } from 'discord-api-types/payloads/v9'
import { SlashCommand } from '../builders/SlashCommand'

export default new SlashCommand<{
  message: string
  uppercase?: boolean
}>({
  name: 'echo',
  description: 'Echoes your text',
})
  .addOption({
    name: 'message',
    description: 'The message to echo',
    type: ApplicationCommandOptionType.String,
    required: true,
  })
  .addOption({
    name: 'uppercase',
    description: 'Make the message uppercase',
    type: ApplicationCommandOptionType.Boolean,
    defaultValue: false,
  })
  .onInteractionCreate((interaction, params) => {
    const { message, uppercase } = params
    interaction.reply(uppercase ? message.toUpperCase() : message)
  })
