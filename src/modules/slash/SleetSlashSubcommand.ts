import {
  APIApplicationCommandSubcommandOption,
  ApplicationCommandOptionType,
} from 'discord-api-types/v9'
import { CommandInteraction } from 'discord.js'
import { SleetRunnable } from '../base/SleetRunnable.js'
import { SlashCommandHandlers } from './types.js'

export interface SleetSlashSubcommandBody
  extends Omit<APIApplicationCommandSubcommandOption, 'type'> {
  type?: ApplicationCommandOptionType.Subcommand
}

export class SleetSlashSubcommand extends SleetRunnable<
  APIApplicationCommandSubcommandOption,
  CommandInteraction
> {
  constructor(body: SleetSlashSubcommandBody, handlers: SlashCommandHandlers) {
    body.type = ApplicationCommandOptionType.Subcommand
    super(body as APIApplicationCommandSubcommandOption, handlers)
  }
}
