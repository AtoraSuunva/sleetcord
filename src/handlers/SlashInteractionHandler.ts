import { CommandInteraction } from 'discord.js'
import { SlashCommand } from '../commands/builders/SlashCommand'
import { baseLogger } from '../logger'

const logger = baseLogger.child({
  name: 'SleetSlashInteraction',
})

export function handleSlashInteraction(
  commands: Map<string, SlashCommand<unknown>>,
  interaction: CommandInteraction,
): void {
  logger.debug(
    `Handling command %s args %o`,
    interaction.commandName,
    interaction.options.data,
  )

  const command = commands.get(interaction.commandName)

  if (command) {
    command.handleInteractionCreate(interaction)
  } else {
    interaction.reply({
      content: 'No slash command found, something is wrong...',
      ephemeral: true,
    })
    logger.error(
      `No slash command found for interaction ${interaction.commandName}`,
    )
  }
}
