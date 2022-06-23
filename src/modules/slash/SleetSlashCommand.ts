import {
  APIApplicationCommandOption,
  ApplicationCommandType,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10'
import { CommandInteraction } from 'discord.js'
import { noop } from '../../utils/funcs.js'
import { SleetCommand } from '../base/SleetCommand.js'
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
import { SleetSlashCommandGroup } from './SleetSlashSubcommandGroup.js'

interface SleetSlashCommandBody
  extends Omit<RESTPostAPIChatInputApplicationCommandsJSONBody, 'options'> {
  options?:
    | (APIApplicationCommandOption | SleetAutocompleteableOption)[]
    | SleetSlashSubcommand[]
    | SleetSlashCommandGroup[]
}

interface SleetSlashCommandBodyJSON
  extends Omit<SleetSlashCommandBody, 'options'> {
  options?: APIApplicationCommandOption[]
}

interface SleetSlashCommandBodyAutocompleteable
  extends Omit<SleetSlashCommandBody, 'options'> {
  options?: (APIApplicationCommandOption | SleetAutocompleteableOption)[]
}

interface SleetSlashCommandBodyWithSubcommands
  extends Omit<SleetSlashCommandBody, 'options'> {
  options?: SleetSlashSubcommand[] | SleetSlashCommandGroup[]
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
  extends SleetCommand<CommandInteraction, [], SlashEventHandlers>
  implements SleetAutocompleteable
{
  public subcommands: Map<string, SleetSlashSubcommand>
  public groups: Map<string, SleetSlashCommandGroup>
  public autocompleteHandlers: Map<string, SleetAutocompleteableOption>

  constructor(
    body: SleetSlashCommandBodyWithSubcommands,
    handlers?: NoRunSlashEventHandlers,
  )
  constructor(
    body: SleetSlashCommandBodyAutocompleteable,
    handlers: SlashEventHandlers,
  )
  constructor(body: SleetSlashCommandBodyJSON, handlers: SlashEventHandlers)
  constructor(
    body: SleetSlashCommandBody,
    handlers: NoRunSlashEventHandlers = {},
  ) {
    const { json, subcommands, groups, autocomplete } =
      parseSlashCommandOptions(body.options)
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
      body as RESTPostAPIChatInputApplicationCommandsJSONBody,
      handlers as SlashEventHandlers,
    )

    this.subcommands = subcommands
    this.groups = groups
    this.autocompleteHandlers = autocomplete
  }

  public override async run(
    context: SleetContext,
    interaction: CommandInteraction,
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
  }

  public autocomplete: SleetAutocompleteable['autocomplete'] =
    autocompleteWithSubcommands.bind(this)
}