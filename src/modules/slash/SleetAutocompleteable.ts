import {
  APIApplicationCommandIntegerOption,
  APIApplicationCommandNumberOption,
  APIApplicationCommandOption,
  APIApplicationCommandOptionChoice,
  APIApplicationCommandStringOption,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'
import { AutocompleteInteraction, Awaitable } from 'discord.js'
import { SlashEventHandlers, SleetContext } from '../events.js'
import { SleetSlashCommand } from './SleetSlashCommand.js'
import { SleetSlashCommandGroup } from './SleetSlashSubcommandGroup.js'

export type AutocompleteHandler<T extends string | number> = (
  this: SleetContext,
  interaction: AutocompleteInteraction,
  name: string,
  value: T,
) => Awaitable<APIApplicationCommandOptionChoice<T>[]>

type APIApplicationAutocompleteableOption =
  | APIApplicationCommandStringOption
  | APIApplicationCommandIntegerOption
  | APIApplicationCommandNumberOption

export type AutocompleteableType = string | number

type GetAutocompleteableOptionType<
  T extends APIApplicationAutocompleteableOption,
> = T['type'] extends ApplicationCommandOptionType.String
  ? string
  : T['type'] extends ApplicationCommandOptionType.Integer
  ? number
  : T['type'] extends ApplicationCommandOptionType.Number
  ? number
  : never

type AutocompleteableOption<T extends APIApplicationAutocompleteableOption> =
  Omit<T, 'autocomplete'> & {
    autocomplete: AutocompleteHandler<GetAutocompleteableOptionType<T>>
  }

type AutocompleteableStringOption =
  AutocompleteableOption<APIApplicationCommandStringOption>

type AutocompleteableIntegerOption =
  AutocompleteableOption<APIApplicationCommandIntegerOption>

type AutocompleteableNumberOption =
  AutocompleteableOption<APIApplicationCommandNumberOption>

export type SleetAutocompleteableOption =
  | AutocompleteableStringOption
  | AutocompleteableIntegerOption
  | AutocompleteableNumberOption

export interface SleetAutocompleteable {
  name: string
  handlers: SlashEventHandlers
  autocompleteHandlers: Map<string, SleetAutocompleteableOption>
  autocomplete(
    context: SleetContext,
    interaction: AutocompleteInteraction,
  ): Awaitable<unknown>
}

export function isAutocompleteableOption(
  option: APIApplicationCommandOption | SleetAutocompleteableOption,
): option is SleetAutocompleteableOption {
  const validType =
    option.type === ApplicationCommandOptionType.String ||
    option.type === ApplicationCommandOptionType.Integer ||
    option.type === ApplicationCommandOptionType.Number

  return validType && typeof option.autocomplete === 'function'
}

type SleetAutocompleteableWithSubcommands = SleetAutocompleteable &
  (SleetSlashCommand | SleetSlashCommandGroup)

export async function autocompleteWithSubcommands(
  this: SleetAutocompleteableWithSubcommands,
  context: SleetContext,
  interaction: AutocompleteInteraction,
) {
  // Check groups first
  if (this instanceof SleetSlashCommand) {
    const group = interaction.options.getSubcommandGroup(false)
    if (group) {
      const groupHandler = this.groups.get(group)
      if (groupHandler) {
        return groupHandler.autocomplete(context, interaction)
      }
    }
  }

  // Check subcommands after
  const subcommand = interaction.options.getSubcommand(false)
  if (subcommand) {
    const subcommandHandler = this.subcommands.get(subcommand)
    if (subcommandHandler) {
      return subcommandHandler.autocomplete(context, interaction)
    }
  }

  // Fall back to checking for a local/global autocomplete handler
  return autocomplete.call(this, context, interaction)
}

export async function autocomplete(
  this: SleetAutocompleteable,
  context: SleetContext,
  interaction: AutocompleteInteraction,
) {
  const { name, value } = interaction.options.getFocused(true)

  // Check for a dedicated handler first
  const autocompleteHandler = this.autocompleteHandlers.get(name)

  if (autocompleteHandler) {
    const isString = typeof value === 'string'
    const isStringType =
      autocompleteHandler.type === ApplicationCommandOptionType.String &&
      isString

    const isNumber = typeof value === 'number'
    const isNumberType =
      (autocompleteHandler.type === ApplicationCommandOptionType.Integer ||
        autocompleteHandler.type === ApplicationCommandOptionType.Number) &&
      isNumber

    let response

    // Doesn't resolve types correctly if you do (<string> || <number>) :(
    // So we need to do this weird redundant check for typescript to be happy
    // without us casting to 'any'
    if (isStringType) {
      response = await autocompleteHandler.autocomplete.call(
        context,
        interaction,
        name,
        value,
      )
    } else if (isNumberType) {
      response = await autocompleteHandler.autocomplete.call(
        context,
        interaction,
        name,
        value,
      )
    }

    if (response) return interaction.respond(response)

    throw new Error(
      `Interaction ${
        this.name
      } received { name: ${name}, value: <${typeof value}> ${value} } as an autocomplete request but expected a ${
        isString ? 'string' : 'number'
      }`,
    )
  }

  // Fall back to the global one if the dedicated one returns nothing or doesn't exist
  const response = await this.handlers.autocomplete?.call(
    context,
    interaction,
    name,
    value,
  )
  if (response) await interaction.respond(response)
}
