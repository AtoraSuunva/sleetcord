import { ContextMenuInteraction } from 'discord.js'
import { UserCommand } from '../commands/builders/UserCommand'
import { baseLogger } from '../logger'

const logger = baseLogger.child({
  name: 'SleetUserInteraction',
})

export function handleUserInteraction(
  commands: Map<string, UserCommand>,
  interaction: ContextMenuInteraction,
): void {
  logger.debug(
    `Handling user interaction %s args %o`,
    interaction.commandName,
    interaction.options.data,
  )

  const command = commands.get(interaction.commandName)

  if (command) {
    command.handleInteractionCreate(interaction)
  } else {
    interaction.reply({
      content: 'No user command found, something is wrong...',
      ephemeral: true,
    })
    logger.error(
      `No user command found for interaction ${interaction.commandName}`,
    )
  }
}
