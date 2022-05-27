import {
  APIApplicationCommandBasicOption,
  APIApplicationCommandSubcommandOption,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'
import { CommandInteraction } from 'discord.js'
import { SleetRunnable } from '../base/SleetRunnable.js'
import { SlashEventHandlers } from '../events.js'
import {
  autocomplete as sleetAutocomplete,
  isAutocompleteableOption,
  SleetAutocompleteable,
  SleetAutocompleteableOption,
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
    CommandInteraction
  >
  implements SleetAutocompleteable
{
  public autocompleteHandlers: Map<string, SleetAutocompleteableOption>

  constructor(body: SleetSlashSubcommandBody, handlers: SlashEventHandlers) {
    const { json, autocomplete } = parseSlashSubcommandOptions(body.options)
    body.type = ApplicationCommandOptionType.Subcommand
    body.options = json

    super(body as APIApplicationCommandSubcommandOption, handlers)

    this.autocompleteHandlers = autocomplete
  }

  public autocomplete: SleetAutocompleteable['autocomplete'] =
    sleetAutocomplete.bind(this)
}
