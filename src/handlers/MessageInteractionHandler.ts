import { ContextMenuInteraction } from 'discord.js'
import { MessageCommand } from '../commands/builders/MessageCommand'
import { baseLogger } from '../logger'

const logger = baseLogger.child({
  name: 'SleetMessageInteraction',
})

export function handleMessageInteraction(
  commands: Map<string, MessageCommand>,
  interaction: ContextMenuInteraction,
): void {
  logger.debug(
    `Handling message interaction %s args %o`,
    interaction.commandName,
    interaction.options.data,
  )

  const command = commands.get(interaction.commandName)

  if (command) {
    command.handleInteractionCreate(interaction)
  } else {
    interaction.reply({
      content: 'No message command found, something is wrong...',
      ephemeral: true,
    })
    logger.error(
      `No message command found for interaction ${interaction.commandName}`,
    )
  }
}
