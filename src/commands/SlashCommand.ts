import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/rest/v9'
import { CommandInteraction } from 'discord.js'
import { Command } from './Command.js'

export abstract class SlashCommand extends Command {
  constructor(body: RESTPostAPIApplicationCommandsJSONBody) {
    super(body)
  }

  abstract run(interaction: CommandInteraction, ...args: unknown[]): void
}
