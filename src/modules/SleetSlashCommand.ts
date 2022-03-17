import { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord-api-types/v9'
import { CommandInteraction } from 'discord.js'
import { CommandEventHandlers, SleetCommand } from './SleetCommand.js'

export type SlashCommandHandlers = CommandEventHandlers<CommandInteraction>

export class SleetSlashCommand extends SleetCommand<CommandInteraction> {
  constructor(
    body: RESTPostAPIChatInputApplicationCommandsJSONBody,
    handlers: SlashCommandHandlers,
  ) {
    super(body, handlers)
  }
}
