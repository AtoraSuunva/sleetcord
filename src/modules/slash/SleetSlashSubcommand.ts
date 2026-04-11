import {
  type APIApplicationCommandBasicOption,
  type APIApplicationCommandSubcommandOption,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'

import type { ChatInputCommandInteraction } from '#discordjs'

import { SleetRunnable } from '../base/SleetRunnable.ts'
import type { SlashEventHandlers } from '../events.ts'
import type { SleetModuleOptions } from '../index.ts'
import {
  isAutocompleteableOption,
  type SleetAutocompleteable,
  type SleetAutocompleteableOption,
  autocomplete as sleetAutocomplete,
} from './SleetAutocompleteable.ts'

export interface SleetSlashSubcommandBody extends Omit<
  APIApplicationCommandSubcommandOption,
  'type' | 'options'
> {
  type?: ApplicationCommandOptionType.Subcommand
  options?: (APIApplicationCommandBasicOption | SleetAutocompleteableOption)[]
}

export interface SleetSlashSubcommandBodyJSON extends Omit<SleetSlashSubcommandBody, 'options'> {
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
  extends SleetRunnable<APIApplicationCommandSubcommandOption, ChatInputCommandInteraction>
  implements SleetAutocompleteable
{
  public autocompleteHandlers: Map<string, SleetAutocompleteableOption>

  constructor(
    body: SleetSlashSubcommandBody,
    handlers: SlashEventHandlers,
    options: SleetModuleOptions = {},
  ) {
    const { json, autocomplete } = parseSlashSubcommandOptions(body.options)
    const { options: _, ...cloneable } = body
    const copiedBody = structuredClone(cloneable) as APIApplicationCommandSubcommandOption
    copiedBody.type = ApplicationCommandOptionType.Subcommand
    copiedBody.options = json

    super(copiedBody, handlers, options)

    this.autocompleteHandlers = autocomplete
  }

  public autocomplete: SleetAutocompleteable['autocomplete'] = sleetAutocomplete.bind(this)
}
