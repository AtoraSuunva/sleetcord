import {
  APIApplicationCommandOption,
  ApplicationCommandType,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v9'
import { CommandInteraction } from 'discord.js'
import { noop } from '../../utils/funcs.js'
import { SleetCommand } from '../base/SleetCommand.js'
import { SleetContext } from '../events.js'
import { SleetSlashSubcommand } from './SleetSlashSubcommand.js'
import { SleetSlashCommandGroup } from './SleetSlashSubcommandGroup.js'
import { SlashCommandHandlers, SlashCommandPartialHandlers } from './types.js'

interface SleetSlashCommandBody
  extends Omit<RESTPostAPIChatInputApplicationCommandsJSONBody, 'options'> {
  options?:
    | APIApplicationCommandOption[]
    | SleetSlashSubcommand[]
    | SleetSlashCommandGroup[]
}

interface SleetSlashCommandBodyJSON
  extends Omit<SleetSlashCommandBody, 'options'> {
  options?: APIApplicationCommandOption[]
}

interface SleetSlashCommandBodyWithSubcommands
  extends Omit<SleetSlashCommandBody, 'options'> {
  options?: SleetSlashSubcommand[] | SleetSlashCommandGroup[]
}

interface ParsedSlashCommandOptions {
  json: APIApplicationCommandOption[]
  subcommands: Map<string, SleetSlashSubcommand>
  groups: Map<string, SleetSlashCommandGroup>
}

function parseSlashCommandOptions(
  options: SleetSlashCommandBody['options'],
): ParsedSlashCommandOptions {
  const json: APIApplicationCommandOption[] = []
  const subcommands = new Map<string, SleetSlashSubcommand>()
  const groups = new Map<string, SleetSlashCommandGroup>()

  if (!options) return { json, subcommands, groups }

  for (const option of options) {
    if (option instanceof SleetSlashSubcommand) {
      subcommands.set(option.name, option)
      json.push(option.body)
    } else if (option instanceof SleetSlashCommandGroup) {
      groups.set(option.name, option)
      json.push(option.body)
    } else {
      json.push(option)
    }
  }

  return { json, subcommands, groups }
}

export class SleetSlashCommand extends SleetCommand<CommandInteraction> {
  public subcommands: Map<string, SleetSlashSubcommand>
  public groups: Map<string, SleetSlashCommandGroup>

  constructor(
    body: SleetSlashCommandBodyWithSubcommands,
    handlers?: SlashCommandPartialHandlers,
  )
  constructor(body: SleetSlashCommandBodyJSON, handlers: SlashCommandHandlers)
  constructor(
    body: SleetSlashCommandBody,
    handlers: SlashCommandPartialHandlers = {},
  ) {
    body.type = ApplicationCommandType.ChatInput
    const { json, subcommands, groups } = parseSlashCommandOptions(body.options)
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
      handlers as SlashCommandHandlers,
    )

    this.subcommands = subcommands
    this.groups = groups
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
}
