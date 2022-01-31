import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/rest/v9'
import { ContextMenuInteraction } from 'discord.js'
import { Command } from './Command.js'

export abstract class ContextMenuCommand extends Command {
  constructor(body: RESTPostAPIApplicationCommandsJSONBody) {
    super(body)
  }

  abstract run(interaction: ContextMenuInteraction): void
}
