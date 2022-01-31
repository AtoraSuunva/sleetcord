import { MessageCommand } from '../builders/MessageCommand'

export default new MessageCommand({
  name: '🥚',
  description: 'Egg a message',
}).onInteractionCreate((interaction, { message }) => {
  message.react('🥚')
  interaction.reply({
    content: 'Egged that message',
    ephemeral: true,
  })
})
