import {
  type APIApplicationCommandSubcommandGroupOption,
  type APIApplicationCommandSubcommandOption,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'

import type { ChatInputCommandInteraction } from '#discordjs'

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

export interface SleetSlashCommandGroupBody extends Omit<
  APIApplicationCommandSubcommandGroupOption,
  'options' | 'type'
> {
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
      throw new Error(`Invalid option '${option.name}' for subcommand group '${body.name}'`)
    }
  }

  return { json, subcommands }
}

export class SleetSlashCommandGroup
  extends SleetRunnable<APIApplicationCommandSubcommandGroupOption, ChatInputCommandInteraction>
  implements SleetAutocompleteable
{
  public subcommands: Map<string, SleetSlashSubcommand>
  // TODO: maybe actually implement this, but i don't feel like it
  public autocompleteHandlers: Map<string, SleetAutocompleteableOption> = new Map()

  constructor(
    body: SleetSlashCommandGroupBody,
    handlers: NoRunSlashEventHandlers = {},
    options: SleetModuleOptions = {},
  ) {
    const { json, subcommands } = parseSlashCommandGroupOptions(body)
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
  }

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

  public autocomplete: SleetAutocompleteable['autocomplete'] =
    autocompleteWithSubcommands.bind(this)
}
