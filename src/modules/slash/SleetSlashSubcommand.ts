import type { ChatInputCommandInteraction } from 'discord.js'
import {
  type APIApplicationCommandBasicOption,
  type APIApplicationCommandSubcommandOption,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'
import { SleetRunnable } from '../base/SleetRunnable.js'
import type { SlashEventHandlers } from '../events.js'
import type { SleetModule } from '../index.js'
import {
  isAutocompleteableOption,
  type SleetAutocompleteable,
  type SleetAutocompleteableOption,
  autocomplete as sleetAutocomplete,
} from './SleetAutocompleteable.js'

export interface SleetSlashSubcommandBody
  extends Omit<APIApplicationCommandSubcommandOption, 'type' | 'options'> {
  type?: ApplicationCommandOptionType.Subcommand
  options?: (APIApplicationCommandBasicOption | SleetAutocompleteableOption)[]
}

export interface SleetSlashSubcommandBodyJSON
  extends Omit<SleetSlashSubcommandBody, 'options'> {
  options?: APIApplicationCommandBasicOption[]
}

interface ParsedSlashSubcommandOptions {
  json: APIApplicationCommandBasicOption[]
  autocomplete: Map<string, SleetAutocompleteableOption>
}

function parseSlashSubcommandOptions(
  options: SleetSlashSubcommandBody['options'] = [],
): ParsedSlashSubcommandOptions {
  const json: APIApplicationCommandBasicOption[] = []
  const autocomplete = new Map<string, SleetAutocompleteableOption>()

  for (const option of options) {
    if (isAutocompleteableOption(option)) {
      autocomplete.set(option.name, option)
      json.push({
        ...option,
        autocomplete: true,
      })
    } else {
      json.push(option)
    }
  }

  return { json, autocomplete }
}

export class SleetSlashSubcommand
  extends SleetRunnable<
    APIApplicationCommandSubcommandOption,
    ChatInputCommandInteraction
  >
  implements SleetAutocompleteable
{
  public autocompleteHandlers: Map<string, SleetAutocompleteableOption>

  constructor(
    body: SleetSlashSubcommandBody,
    handlers: SlashEventHandlers,
    modules: SleetModule[] = [],
  ) {
    const { json, autocomplete } = parseSlashSubcommandOptions(body.options)
    body.type = ApplicationCommandOptionType.Subcommand
    body.options = json

    super(body as APIApplicationCommandSubcommandOption, handlers, modules)

    this.autocompleteHandlers = autocomplete
  }

  public autocomplete: SleetAutocompleteable['autocomplete'] =
    sleetAutocomplete.bind(this)
}
