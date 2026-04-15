import {
  type APIApplicationCommandSubcommandGroupOption,
  type APIApplicationCommandSubcommandOption,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'
import type { ChatInputCommandInteraction } from 'discord.js'

import { noop } from '../../utils/functions.ts'
import { SleetRunnable } from '../base/SleetRunnable.ts'
import type { NoRunSlashEventHandlers, SlashEventHandlers, SleetContext } from '../events.ts'
import type { SleetModuleOptions } from '../index.ts'
import {
  autocompleteWithSubcommands,
  type SleetAutocompleteable,
  type SleetAutocompleteableOption,
} from './SleetAutocompleteable.ts'
import { SleetSlashSubcommand } from './SleetSlashSubcommand.ts'

/**
 * The body of a slash command group, which is identical to the API body but enforces the SubcommandGroup type and allows SleetSlashSubcommands as options for easier registration of subcommands within the group
 */
export interface SleetSlashCommandGroupBody extends Omit<
  APIApplicationCommandSubcommandGroupOption,
  'options' | 'type'
> {
  /**
   * The type of the command group, which is always SubcommandGroup
   */
  type?: ApplicationCommandOptionType.SubcommandGroup
  /**
   * The options for the command group, which can be a mix of SleetSlashSubcommand instances and raw API subcommand options
   */
  options: SleetSlashSubcommand[] | APIApplicationCommandSubcommandOption[]
}

interface ParsedSleetSlashCommandGroupOptions {
  json: APIApplicationCommandSubcommandOption[]
  subcommands: Map<string, SleetSlashSubcommand>
  autocomplete: Map<string, SleetAutocompleteableOption>
}

function parseSlashCommandGroupOptions(
  body: SleetSlashCommandGroupBody,
): ParsedSleetSlashCommandGroupOptions {
  const json: APIApplicationCommandSubcommandOption[] = []
  const subcommands = new Map<string, SleetSlashSubcommand>()
  const autocomplete = new Map<string, SleetAutocompleteableOption>()

  for (const option of body.options) {
    if (option instanceof SleetSlashSubcommand) {
      subcommands.set(option.name, option)
      json.push(option.body)
    } else {
      throw new Error(`Invalid option '${option.name}' for subcommand group '${body.name}'`)
    }
  }

  return { json, subcommands, autocomplete }
}

/**
 * Represents a slash command group, which can have subcommands and options with autocomplete handlers.
 *
 * A SleetSlashCommandGroup will automatically handle routing to subcommands and autocomplete handlers based on interaction data
 */
export class SleetSlashCommandGroup
  extends SleetRunnable<APIApplicationCommandSubcommandGroupOption, ChatInputCommandInteraction>
  implements SleetAutocompleteable
{
  /**
   * A map of subcommand name to subcommand handler. These are ran when a subcommand in the group is ran, and are not ran when the base group command is ran.
   */
  public subcommands: Map<string, SleetSlashSubcommand>
  /**
   * TODO: This isn't actually implemented yet, needs some clever types to accept autocomplete handlers as options
   * A map of option name to autocomplete handler. These are ran when the option is focused, and are not ran when the base command is ran.
   */
  public autocompleteHandlers: Map<string, SleetAutocompleteableOption>
  /**
   * The autocomplete handler, which will handle routing autocomplete interactions to subcommands automatically if needed
   */
  public autocomplete: SleetAutocompleteable['autocomplete'] =
    autocompleteWithSubcommands.bind(this)

  constructor(
    body: SleetSlashCommandGroupBody,
    handlers: NoRunSlashEventHandlers = {},
    options: SleetModuleOptions = {},
  ) {
    const { json, subcommands, autocomplete } = parseSlashCommandGroupOptions(body)
    const { options: _, ...cloneable } = body
    const copiedBody = structuredClone(cloneable) as APIApplicationCommandSubcommandGroupOption
    copiedBody.type = ApplicationCommandOptionType.SubcommandGroup
    copiedBody.options = json

    if (!handlers.run) handlers.run = noop

    const modules = [...subcommands.values(), ...(options.modules ?? [])]

    super(copiedBody, handlers as SlashEventHandlers, {
      ...options,
      modules,
    })

    this.subcommands = subcommands
    this.autocompleteHandlers = autocomplete
  }

  /**
   * Run the slash command group, which will first run the group's own handler, then route to subcommands if any are registered and specified in the interaction data.
   */
  public override async run(
    context: SleetContext,
    interaction: ChatInputCommandInteraction,
  ): Promise<unknown> {
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
      }

      throw new Error(`Unknown subcommand '${subcommand}' for subcommand group '${this.name}'`)
    }

    return undefined
  }
}
