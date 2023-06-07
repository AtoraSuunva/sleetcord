import {
  APIApplicationCommandSubcommandGroupOption,
  APIApplicationCommandSubcommandOption,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'
import { ChatInputCommandInteraction } from 'discord.js'
import { noop } from '../../utils/funcs.js'
import { SleetRunnable } from '../base/SleetRunnable.js'
import {
  NoRunSlashEventHandlers,
  SlashEventHandlers,
  SleetContext,
} from '../events.js'
import {
  autocompleteWithSubcommands,
  SleetAutocompleteable,
  SleetAutocompleteableOption,
} from './SleetAutocompleteable.js'
import { SleetSlashSubcommand } from './SleetSlashSubcommand.js'
import { SleetModule } from '../index.js'

export interface SleetSlashCommandGroupBody
  extends Omit<APIApplicationCommandSubcommandGroupOption, 'options' | 'type'> {
  type?: ApplicationCommandOptionType.SubcommandGroup
  options: SleetSlashSubcommand[] | APIApplicationCommandSubcommandOption[]
}

interface ParsedSleetSlashCommandGroupOptions {
  json: APIApplicationCommandSubcommandOption[]
  subcommands: Map<string, SleetSlashSubcommand>
}

function parseSlashCommandGroupOptions(
  body: SleetSlashCommandGroupBody,
): ParsedSleetSlashCommandGroupOptions {
  const json: APIApplicationCommandSubcommandOption[] = []
  const subcommands = new Map<string, SleetSlashSubcommand>()

  for (const option of body.options) {
    if (option instanceof SleetSlashSubcommand) {
      subcommands.set(option.name, option)
      json.push(option.body)
    } else {
      throw new Error(
        `Invalid option '${option.name}' for subcommand group '${body.name}'`,
      )
    }
  }

  return { json, subcommands }
}

export class SleetSlashCommandGroup
  extends SleetRunnable<
    APIApplicationCommandSubcommandGroupOption,
    ChatInputCommandInteraction
  >
  implements SleetAutocompleteable
{
  public subcommands: Map<string, SleetSlashSubcommand>
  // TODO: maybe actually implement this, but i don't feel like it
  public autocompleteHandlers = new Map<string, SleetAutocompleteableOption>()

  constructor(
    body: SleetSlashCommandGroupBody,
    handlers: NoRunSlashEventHandlers = {},
    modules: SleetModule[] = [],
  ) {
    const { json, subcommands } = parseSlashCommandGroupOptions(body)

    body.type = ApplicationCommandOptionType.SubcommandGroup
    body.options = json
    if (!handlers.run) handlers.run = noop

    super(
      body as APIApplicationCommandSubcommandGroupOption,
      handlers as SlashEventHandlers,
      [...subcommands.values(), ...modules],
    )

    this.subcommands = subcommands
  }

  public override async run(
    context: SleetContext,
    interaction: ChatInputCommandInteraction,
  ) {
    // First run the handler for the subcommand group itself
    // Users can throw errors to exit execution early to have things like permission
    // or condition checking for entire groups in 1 place
    await super.run(context, interaction)

    // Check subcommands after
    const subcommand = interaction.options.getSubcommand()
    if (subcommand) {
      const subcommandHandler = this.subcommands.get(subcommand)
      if (subcommandHandler) {
        return subcommandHandler.run(context, interaction)
      } else {
        throw new Error(
          `Unknown subcommand '${subcommand}' for subcommand group '${this.name}'`,
        )
      }
    }

    return
  }

  public autocomplete: SleetAutocompleteable['autocomplete'] =
    autocompleteWithSubcommands.bind(this)
}
