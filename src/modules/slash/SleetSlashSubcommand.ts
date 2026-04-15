import {
  type APIApplicationCommandBasicOption,
  type APIApplicationCommandSubcommandOption,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'
import type { ChatInputCommandInteraction } from 'discord.js'

import { SleetRunnable } from '../base/SleetRunnable.ts'
import type { SlashEventHandlers } from '../events.ts'
import type { SleetModuleOptions } from '../index.ts'
import {
  isAutocompleteableOption,
  type SleetAutocompleteable,
  type SleetAutocompleteableOption,
  autocomplete as sleetAutocomplete,
} from './SleetAutocompleteable.ts'

/**
 * The body for creating a slash subcommand, which can have options that are API types or Sleet types with autocomplete handlers.
 *
 * A SleetSlashSubcommandBody will be used to create a SleetSlashSubcommand, which will automatically handle routing autocomplete interactions to the appropriate handlers based on interaction data
 */
export interface SleetSlashSubcommandBody extends Omit<
  APIApplicationCommandSubcommandOption,
  'type' | 'options'
> {
  /**
   * The type of the subcommand, which is always Subcommand
   */
  type?: ApplicationCommandOptionType.Subcommand
  /**
   * The options for the subcommand, which can be a mix of API options and SleetAutocompleteable options
   */
  options?: (APIApplicationCommandBasicOption | SleetAutocompleteableOption)[]
}

/**
 * The body for creating a slash subcommand, but with all options as raw API options.
 */
export interface SleetSlashSubcommandBodyJSON extends Omit<SleetSlashSubcommandBody, 'options'> {
  /**
   * The options for the subcommand, as raw API options. These won't have any autocomplete handlers.
   */
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

/**
 * Represents a slash subcommand, which can have options with autocomplete handlers.
 *
 * A SleetSlashSubcommand will automatically handle routing autocomplete interactions to the appropriate handlers based on interaction data
 */
export class SleetSlashSubcommand
  extends SleetRunnable<APIApplicationCommandSubcommandOption, ChatInputCommandInteraction>
  implements SleetAutocompleteable
{
  /**
   * A map of option name to autocomplete handler for options in this subcommand
   */
  public autocompleteHandlers: Map<string, SleetAutocompleteableOption>
  /**
   * The autocomplete handler, which will route to the appropriate handler based on interaction data
   */
  public autocomplete: SleetAutocompleteable['autocomplete'] = sleetAutocomplete.bind(this)

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
}
