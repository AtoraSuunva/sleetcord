import { CommandInteraction } from 'discord.js'
import { PreRunError } from '../errors/PreRunError.js'

interface GetIntInRangeOptions<Required extends boolean> {
  /** The name of the option you're fetching */
  name: string
  /** A custom error message, if any, to show instead of the default one */
  message?: string
  /** The minimum value accepted (inclusive) */
  min?: number
  /** The maximum value accepted (inclusive) */
  max?: number
  /** Whether the option is required or not */
  required?: Required
}

/**
 * Get an integer option and validate that it's within a lower/upper range
 *
 * Both the lower and upper ranges are optional so you can cap it only on one end
 *
 * An error message is automatically generated if you don't specify a custom one
 *
 * @param interaction The interaction to pull the option from
 * @param options The options for how to fetch the option
 * @returns The option, validated. If the validation fails, a `PreRunError` is thrown,
 * command execution fails, and the user is notified
 */
export function getIntInRange<R extends boolean>(
  interaction: CommandInteraction,
  { name, message: customMessage, min, max, required }: GetIntInRangeOptions<R>,
): number | null {
  const bothBounds = min !== undefined && max !== undefined

  return getIntWithValidation(interaction, {
    name,
    validator: (v) =>
      (min === undefined || v >= min) && (max === undefined || v <= max),
    message:
      customMessage ??
      `Option '${name}' must be ${
        bothBounds
          ? 'between'
          : min !== undefined
          ? 'no less than'
          : 'no greater than'
      } ${min !== undefined ? min : ''}${bothBounds ? ' and ' : ''}${
        max !== undefined ? max : ''
      }`,
    required,
  })
}

interface GetIntValidatedOptions<Required extends boolean> {
  /** The name of the option you're fetching */
  name: string
  /** A function to validate the number, if the option is present */
  validator: (num: number) => boolean
  /** The error message to show if the validation failed */
  message: string
  /** Whether the option is required or not */
  required?: Required | undefined
}

/**
 * Get an int from an interaction's parameters, with additional validation done
 *
 * Mostly useful as a function to compose your own validation functions
 *
 * @param interaction The interaction to pull the option from
 * @param options The options for how to fetch the option
 * @returns The option, validated. If the validation fails, a `PreRunError` is thrown,
 * command execution fails, and the user is notified
 */
export function getIntWithValidation(
  interaction: CommandInteraction,
  { name, validator, message, required }: GetIntValidatedOptions<true>,
): number

export function getIntWithValidation<R extends boolean>(
  interaction: CommandInteraction,
  { name, validator, message, required }: GetIntValidatedOptions<R>,
): number | null

export function getIntWithValidation<R extends boolean>(
  interaction: CommandInteraction,
  { name, validator, message, required }: GetIntValidatedOptions<R>,
): number | null {
  const value = interaction.options.getInteger(name, required)
  if (value !== null && !validator(value)) {
    throw new PreRunError(message)
  }

  return value
}
