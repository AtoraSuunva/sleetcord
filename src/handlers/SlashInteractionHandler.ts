import { CommandInteraction } from 'discord.js'
import { SlashCommand } from '../commands/CommandBuilder'

export function handleSlashInteraction(
  commands: Map<string, SlashCommand>,
  interaction: CommandInteraction,
): void {
  console.log(
    'Handling command',
    interaction.commandName,
    'args',
    interaction.options.data,
  )

  const command = commands.get(interaction.commandName)

  if (command) {
    command.run(interaction)
  } else {
    console.error(
      `No slash command found for interaction ${interaction.commandName}`,
    )
  }
}
