import {
  APIApplicationCommandOption,
  ApplicationCommandType,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10'
import { ChatInputCommandInteraction } from 'discord.js'
import { noop } from '../../utils/functions.js'
import { SleetCommand, SleetCommandExtras } from '../base/SleetCommand.js'
import {
  NoRunSlashEventHandlers,
  SlashEventHandlers,
  SleetContext,
} from '../events.js'
import {
  autocompleteWithSubcommands,
  isAutocompleteableOption,
  SleetAutocompleteable,
  SleetAutocompleteableOption,
} from './SleetAutocompleteable.js'
import { SleetSlashSubcommand } from './SleetSlashSubcommand.js'
import { SleetSlashCommandGroup } from './SleetSlashCommandGroup.js'
import { SleetModule } from '../index.js'

interface BaseCommandBody
  extends Omit<
      RESTPostAPIChatInputApplicationCommandsJSONBody,
      'options' | keyof SleetCommandExtras
    >,
    SleetCommandExtras {}

export interface SleetSlashCommandBody extends BaseCommandBody {
  options?:
    | (APIApplicationCommandOption | SleetAutocompleteableOption)[]
    | (SleetSlashSubcommand | SleetSlashCommandGroup)[]
}

export interface SleetSlashCommandBodyJSON
  extends Omit<SleetSlashCommandBody, 'options'> {
  options?: APIApplicationCommandOption[]
}

export interface SleetSlashCommandBodyAutocompleteable
  extends Omit<SleetSlashCommandBody, 'options'> {
  options?: (APIApplicationCommandOption | SleetAutocompleteableOption)[]
}

export interface SleetSlashCommandBodyWithSubcommands
  extends Omit<SleetSlashCommandBody, 'options'> {
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

export class SleetSlashCommand
  extends SleetCommand<ChatInputCommandInteraction, [], SlashEventHandlers>
  implements SleetAutocompleteable
{
  public subcommands: Map<string, SleetSlashSubcommand>
  public groups: Map<string, SleetSlashCommandGroup>
  public autocompleteHandlers: Map<string, SleetAutocompleteableOption>

  constructor(
    body: SleetSlashCommandBodyWithSubcommands,
    handlers?: NoRunSlashEventHandlers,
    modules?: SleetModule[],
  )
  constructor(
    body: SleetSlashCommandBodyAutocompleteable,
    handlers: SlashEventHandlers,
    modules?: SleetModule[],
  )
  constructor(body: SleetSlashCommandBodyJSON, handlers: SlashEventHandlers)
  constructor(
    body: SleetSlashCommandBody,
    handlers: NoRunSlashEventHandlers = {},
    modules: SleetModule[] = [],
  ) {
    const { json, subcommands, groups, autocomplete } =
      parseSlashCommandOptions(body.options)
    // TODO: probably copy this instead of modifying it in-place. Same issue of knowing which properties to copy as removing the cast
    body.type = ApplicationCommandType.ChatInput
    body.options = json

    if (
      subcommands.size === 0 &&
      groups.size === 0 &&
      handlers.run === undefined
    ) {
      throw new Error(
        `No run handler provided for command '${body.name}', either provide a run handler or use subcommands/subcommand groups.`,
      )
    }

    // Just in case, but shouldn't run into an issue
    if (!handlers.run) handlers.run = noop

    super(
      // TODO: cast can be avoided by copying everything into a new object of the correct type
      // is it worth the effort of maintaining which properties to copy?
      body as RESTPostAPIChatInputApplicationCommandsJSONBody,
      handlers as SlashEventHandlers,
      [...subcommands.values(), ...groups.values(), ...modules],
    )

    this.subcommands = subcommands
    this.groups = groups
    this.autocompleteHandlers = autocomplete
  }

  public override async run(
    context: SleetContext,
    interaction: ChatInputCommandInteraction,
  ) {
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
      } else {
        throw new Error(`Unknown group '${group}' for command '${this.name}'`)
      }
    }

    // Check subcommands after, we run these effectively directly
    const subcommand = interaction.options.getSubcommand(false)
    if (subcommand) {
      const subcommandHandler = this.subcommands.get(subcommand)
      if (subcommandHandler) {
        return subcommandHandler.run(context, interaction)
      } else {
        throw new Error(
          `Unknown subcommand '${subcommand}' for command '${this.name}'`,
        )
      }
    }

    return
  }

  public autocomplete: SleetAutocompleteable['autocomplete'] =
    autocompleteWithSubcommands.bind(this)
}
