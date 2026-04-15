import {
  type APIApplicationCommandOption,
  ApplicationCommandType,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10'
import type {
  ChatInputCommandInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
} from 'discord.js'

import { noop } from '../../utils/functions.ts'
import { SleetCommand, type SleetCommandExtras } from '../base/SleetCommand.ts'
import type { NoRunSlashEventHandlers, SlashEventHandlers, SleetContext } from '../events.ts'
import type { SleetModuleOptions } from '../index.ts'
import {
  autocompleteWithSubcommands,
  isAutocompleteableOption,
  type SleetAutocompleteable,
  type SleetAutocompleteableOption,
} from './SleetAutocompleteable.ts'
import { SleetSlashCommandGroup } from './SleetSlashCommandGroup.ts'
import { SleetSlashSubcommand } from './SleetSlashSubcommand.ts'

interface BaseCommandBody
  extends
    Omit<RESTPostAPIChatInputApplicationCommandsJSONBody, 'options' | keyof SleetCommandExtras>,
    SleetCommandExtras {}

/**
 * The body for creating a slash command, which can have subcommands, subcommand groups, and options with autocomplete handlers.
 *
 * The options field can be a mix of (normal API options AND options with autocomplete handlers) OR (Sleet subcommands AND Sleet subcommand groups). The SleetSlashCommand class will handle routing to the correct handlers based on interaction data.
 */
export interface SleetSlashCommandBody extends BaseCommandBody {
  /**
   * Either:
   * - A mix of normal API options and options with autocomplete handlers. These will be ran when the base command is ran, and the autocomplete handlers will be ran when their respective options are focused.
   * OR
   * - A mix of SleetSlashSubcommand and SleetSlashCommandGroup instances. These will be ran when their respective subcommands are ran, and won't run when the base command is ran.
   *
   * These two options are mutually exclusive, you can't have subcommands/subcommand groups and options with autocomplete handlers in the same command.
   */
  options?:
    | (APIApplicationCommandOption | SleetAutocompleteableOption)[]
    | (SleetSlashSubcommand | SleetSlashCommandGroup)[]
}

/**
 * The body for creating a slash command, but with all options as raw API options.
 */
export interface SleetSlashCommandBodyJSON extends Omit<SleetSlashCommandBody, 'options'> {
  /**
   * The options for the command, as raw API options. These will be ran when the base command is ran, and won't have any automatic autocomplete handlers.
   */
  options?: APIApplicationCommandOption[]
}

/**
 * The body for creating a slash command, but with options that can have autocomplete handlers, but can't have subcommands or subcommand groups.
 */
export interface SleetSlashCommandBodyAutocompleteable extends Omit<
  SleetSlashCommandBody,
  'options'
> {
  /**
   * The options for the command, which can be a mix of normal API options and options with autocomplete handlers. These will be ran when the base command is ran, and the autocomplete handlers will be ran when their respective options are focused.
   */
  options?: (APIApplicationCommandOption | SleetAutocompleteableOption)[]
}

/**
 * The body for creating a slash command, but with options that can be subcommands or subcommand groups, but can't have options with autocomplete handlers.
 */
export interface SleetSlashCommandBodyWithSubcommands extends Omit<
  SleetSlashCommandBody,
  'options'
> {
  /**
   * The options for the command, which can be a mix of SleetSlashSubcommand and SleetSlashCommandGroup instances. These will be ran when their respective subcommands are ran, and won't run when the base command is ran.
   */
  options?: (SleetSlashSubcommand | SleetSlashCommandGroup)[]
}

interface ParsedSlashCommandOptions {
  json: APIApplicationCommandOption[]
  subcommands: Map<string, SleetSlashSubcommand>
  groups: Map<string, SleetSlashCommandGroup>
  autocomplete: Map<string, SleetAutocompleteableOption>
}

function parseSlashCommandOptions(
  options: SleetSlashCommandBody['options'] = [],
): ParsedSlashCommandOptions {
  const json: APIApplicationCommandOption[] = []
  const subcommands = new Map<string, SleetSlashSubcommand>()
  const groups = new Map<string, SleetSlashCommandGroup>()
  const autocomplete = new Map<string, SleetAutocompleteableOption>()

  for (const option of options) {
    if (option instanceof SleetSlashSubcommand) {
      subcommands.set(option.name, option)
      json.push(option.body)
    } else if (option instanceof SleetSlashCommandGroup) {
      groups.set(option.name, option)
      json.push(option.body)
    } else {
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
  }

  return { json, subcommands, groups, autocomplete }
}

/**
 * Represents a slash command (aka Chat Input Command), which can have subcommands, subcommand groups, and options with autocomplete handlers.
 *
 * A SleetSlashCommand will automatically handle routing to subcommands, subcommand groups, and autocomplete handlers based on interaction data
 */
export class SleetSlashCommand
  extends SleetCommand<ChatInputCommandInteraction, [], SlashEventHandlers>
  implements SleetAutocompleteable
{
  /**
   * A map of subcommand name to subcommand handler. These are ran when the subcommand is ran, and are not ran when the base command is ran.
   */
  public subcommands: Map<string, SleetSlashSubcommand>
  /**
   * A map of subcommand group name to subcommand group handler. These are ran when a subcommand in the group is ran, and are not ran when the base command is ran.
   */
  public groups: Map<string, SleetSlashCommandGroup>
  /**
   * A map of option name to autocomplete handler. These are ran when the option is focused, and are not ran when the base command is ran.
   */
  public autocompleteHandlers: Map<string, SleetAutocompleteableOption>
  /**
   * The autocomplete handler, which will handle routing autocomplete interactions to subcommands/subcommand groups automatically if needed
   */
  public autocomplete: SleetAutocompleteable['autocomplete'] =
    autocompleteWithSubcommands.bind(this)

  constructor(
    body: SleetSlashCommandBodyWithSubcommands,
    handlers?: NoRunSlashEventHandlers,
    options?: SleetModuleOptions,
  )
  constructor(
    body: SleetSlashCommandBodyAutocompleteable,
    handlers: SlashEventHandlers,
    options?: SleetModuleOptions,
  )
  constructor(body: SleetSlashCommandBodyJSON, handlers: SlashEventHandlers)
  constructor(
    body: SleetSlashCommandBody,
    handlers: NoRunSlashEventHandlers = {},
    options: SleetModuleOptions = {},
  ) {
    const { json, subcommands, groups, autocomplete } = parseSlashCommandOptions(body.options)
    const { options: _, ...cloneable } = body
    const copiedBody = structuredClone(cloneable) as RESTPostAPIApplicationCommandsJSONBody
    copiedBody.type = ApplicationCommandType.ChatInput
    copiedBody.options = json

    if (subcommands.size === 0 && groups.size === 0 && handlers.run === undefined) {
      throw new Error(
        `No run handler provided for command '${body.name}', either provide a run handler or use subcommands/subcommand groups.`,
      )
    }

    // Just in case, but shouldn't run into an issue
    if (!handlers.run) handlers.run = noop

    const modules = [...subcommands.values(), ...groups.values(), ...(options?.modules ?? [])]

    super(copiedBody, handlers as SlashEventHandlers, {
      ...options,
      modules,
    })

    this.subcommands = subcommands
    this.groups = groups
    this.autocompleteHandlers = autocomplete
  }

  /**
   * Run the slash command, which will first run the command's own handler, then route to subcommand groups and subcommands if any are registered and specified in the interaction data.
   *
   * @throws If a group or subcommand is specified in the interaction data that doesn't have a registered handler
   * @returns The result of the ran handler, if any
   */
  public override async run(
    context: SleetContext,
    interaction: ChatInputCommandInteraction,
  ): Promise<unknown> {
    // First run the handler for the command itself
    // Users can throw errors to exit execution early to have things like permission
    // or condition checking for entire groups or subcommands in 1 place
    await super.run(context, interaction)

    // Check groups first, they'll handle routing their own subcommands
    const group = interaction.options.getSubcommandGroup(false)
    if (group) {
      const groupHandler = this.groups.get(group)
      if (groupHandler) {
        return groupHandler.run(context, interaction)
      }

      throw new Error(`Unknown group '${group}' for command '${this.name}'`)
    }

    // Check subcommands after, we run these effectively directly
    const subcommand = interaction.options.getSubcommand(false)
    if (subcommand) {
      const subcommandHandler = this.subcommands.get(subcommand)
      if (subcommandHandler) {
        return subcommandHandler.run(context, interaction)
      }

      throw new Error(`Unknown subcommand '${subcommand}' for command '${this.name}'`)
    }

    return undefined
  }
}
