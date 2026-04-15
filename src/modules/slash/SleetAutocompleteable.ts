import {
  type APIApplicationCommandIntegerOption,
  type APIApplicationCommandNumberOption,
  type APIApplicationCommandOption,
  type APIApplicationCommandOptionChoice,
  type APIApplicationCommandStringOption,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'
import type {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  Awaitable,
} from 'discord.js'

import type { SlashEventHandlers, SleetContext } from '../events.ts'
import { SleetSlashCommand } from './SleetSlashCommand.ts'
import type { SleetSlashCommandGroup } from './SleetSlashCommandGroup.ts'

export type AutocompleteableType = string | number

/**
 * Arguments passed to an autocomplete handler function, including the Sleet context, the original interaction, the name of the focused option, and its current value. The type of the value is determined by the option type (string or number).
 */
export interface AutocompleteArguments<T> {
  /**
   * The Sleet context for the current interaction, provides access to the SleetClient and Discord.js Client
   */
  context: SleetContext
  /**
   * The original AutocompleteInteraction from Discord.js, contains all the data about the interaction and methods to respond to it
   */
  interaction: AutocompleteInteraction
  /**
   * The name of the currently focused option that the user is trying to autocomplete.
   */
  name: string
  /**
   * The current value of the focused option, which the user has typed so far. This is what the autocomplete handler will use to generate suggestions.
   */
  value: T
}

/**
 * A type for autocomplete handler functions, which take in AutocompleteArguments and return an array of choices to suggest to the user. The type parameter T represents the type of the option value being autocompleted (string or number).
 */
export type AutocompleteHandler<T extends AutocompleteableType> = (
  args: AutocompleteArguments<T>,
) => Awaitable<APIApplicationCommandOptionChoice<T>[]>

/**
 * A union type representing the options that can be autocompleted by Sleet. This includes string, integer, and number options that have an autocomplete handler function defined.
 */
export type APIApplicationAutocompleteableOption =
  | APIApplicationCommandStringOption
  | APIApplicationCommandIntegerOption
  | APIApplicationCommandNumberOption

/**
 * A utility type to extract the correct option value type (string or number) based on the option's type property. This is used to ensure that the autocomplete handler receives the correct type of value for the option it is autocompleting.
 */
export type GetAutocompleteableOptionType<T extends APIApplicationAutocompleteableOption> =
  T['type'] extends ApplicationCommandOptionType.String
    ? string
    : T['type'] extends ApplicationCommandOptionType.Integer
      ? number
      : T['type'] extends ApplicationCommandOptionType.Number
        ? number
        : never

/**
 * A type for options that can be autocompleted by Sleet. This extends the standard Discord API option types (string, integer, number) and requires an autocomplete handler function to be defined. The choices property is forced to be omitted or an empty array as the Discord API enforces no choices combined with autocomplete
 */
export type AutocompleteableOption<T extends APIApplicationAutocompleteableOption> = Omit<
  T,
  'autocomplete'
> & {
  /** The autocomplete handler function for this option. This function will be called when the user focuses on this option in an autocomplete interaction. */
  autocomplete: AutocompleteHandler<GetAutocompleteableOptionType<T>>
  /** An empty array to prevent conflicts with the autocomplete handler, as options with choices cannot have autocomplete enabled in the Discord API. */
  choices?: []
}

/** A type for string options that can be autocompleted by Sleet. */
export type AutocompleteableStringOption = AutocompleteableOption<APIApplicationCommandStringOption>

/** A type for integer options that can be autocompleted by Sleet. */
export type AutocompleteableIntegerOption =
  AutocompleteableOption<APIApplicationCommandIntegerOption>

/** A type for number options that can be autocompleted by Sleet. */
export type AutocompleteableNumberOption = AutocompleteableOption<APIApplicationCommandNumberOption>

/**
 * A union type representing the specific option types that can be autocompleted by Sleet, each with their own required autocomplete handler. This is used in the SleetAutocompleteable interface to define the types of options that can have dedicated autocomplete handlers.
 */
export type SleetAutocompleteableOption =
  | AutocompleteableStringOption
  | AutocompleteableIntegerOption
  | AutocompleteableNumberOption

/**
 * An interface for commands, groups, or subcommands that support autocomplete options. Contains the name of the command/group/subcommand, its event handlers, a map of option names to their dedicated autocomplete handlers, and a method to handle autocomplete interactions by routing them to the appropriate handler based on the focused option. See {@link SleetSlashCommand}, {@link SleetSlashCommandGroup}, and {@link SleetSlashSubcommand} for more details on how to use this interface in your commands.
 */
export interface SleetAutocompleteable {
  /**
   * The name of the command, group, or subcommand that this autocompleteable belongs to. Used for routing autocomplete interactions to the correct handler.
   */
  name: string
  /**
   * The event handlers for this autocompleteable.
   */
  handlers: SlashEventHandlers
  /**
   * A map of option names to their dedicated autocomplete handlers. If an option has a handler in this map, it will be called instead of the global autocomplete handler when that option is focused in an autocomplete interaction.
   * The keys of the map are the option names, and the values are the corresponding autocomplete handlers for those options.
   */
  autocompleteHandlers: Map<string, SleetAutocompleteableOption>
  /**
   * A method to handle autocomplete interactions for this command/group/subcommand. This method is automatically called by Sleet when an autocomplete interaction is received for this command/group/subcommand, and it should route autocomplete requests to either its own handlers or to a child module's autocomplete as appropriate
   */
  autocomplete(context: SleetContext, interaction: AutocompleteInteraction): Awaitable<unknown>
}

/**
 * Type guard to check if an option is autocompleteable by Sleet. Validates that the option is of a type that supports autocomplete and has an autocomplete handler function.
 */
export function isAutocompleteableOption(
  option: APIApplicationCommandOption | SleetAutocompleteableOption,
): option is SleetAutocompleteableOption {
  const validType =
    option.type === ApplicationCommandOptionType.String ||
    option.type === ApplicationCommandOptionType.Integer ||
    option.type === ApplicationCommandOptionType.Number

  return validType && typeof option.autocomplete === 'function'
}

/**
 * A union type representing any Sleet command, group, or subcommand that supports autocomplete options.
 */
export type SleetAutocompleteableWithSubcommands = SleetAutocompleteable &
  (SleetSlashCommand | SleetSlashCommandGroup)

/**
 * Handles autocomplete interactions for a command, group, or subcommand. Checks for handlers in the following order:
 * 1. Subcommand (if applicable)
 * 2. Group (if applicable)
 * 3. Local/global autocomplete handler
 */
export async function autocompleteWithSubcommands(
  this: SleetAutocompleteableWithSubcommands,
  context: SleetContext,
  interaction: AutocompleteInteraction,
): Promise<unknown> {
  // Check subcommands first (most specific)
  const subcommand = interaction.options.getSubcommand(false)
  if (subcommand) {
    const subcommandHandler = this.subcommands.get(subcommand)
    if (subcommandHandler) {
      return subcommandHandler.autocomplete(context, interaction)
    }
  }

  // Check groups second (less specific)
  if (this instanceof SleetSlashCommand) {
    const group = interaction.options.getSubcommandGroup(false)
    if (group) {
      const groupHandler = this.groups.get(group)
      if (groupHandler) {
        return groupHandler.autocomplete(context, interaction)
      }
    }
  }

  // Fall back to checking for a local/global autocomplete handler (least specific)
  return autocomplete.call(this, context, interaction)
}

/**
 * Handles autocomplete interactions for a command or subcommand. Checks for a dedicated handler for the focused option first, then falls back to the global one if it exists.
 */
export async function autocomplete(
  this: SleetAutocompleteable,
  context: SleetContext,
  interaction: AutocompleteInteraction,
): Promise<void> {
  const { name, value } = interaction.options.getFocused(true)

  // Check for a dedicated handler first
  const autocompleteHandler = this.autocompleteHandlers.get(name)

  if (autocompleteHandler) {
    const isString = typeof value === 'string'
    const isStringType =
      autocompleteHandler.type === ApplicationCommandOptionType.String && isString

    const isNumber = typeof value === 'number'
    const isNumberType =
      (autocompleteHandler.type === ApplicationCommandOptionType.Integer ||
        autocompleteHandler.type === ApplicationCommandOptionType.Number) &&
      isNumber

    let response: ApplicationCommandOptionChoiceData[] | null = null

    // Doesn't resolve types correctly if you do (<string> || <number>) :(
    // So we need to do this weird redundant check for typescript to be happy
    // without us casting to 'any'
    if (isStringType) {
      response = await autocompleteHandler.autocomplete.call(context, {
        context,
        interaction,
        name,
        value,
      })
    } else if (isNumberType) {
      response = await autocompleteHandler.autocomplete.call(context, {
        context,
        interaction,
        name,
        value,
      })
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
  const response = await this.handlers.autocomplete?.call(context, interaction, name, value)
  if (response) await interaction.respond(response)
}
