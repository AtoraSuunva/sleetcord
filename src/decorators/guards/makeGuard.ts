import { Interaction } from 'discord.js'
import { Command } from '../../commands/Command'
import { MethodDecorator } from '../types'

/**
 * A function that "guards" execution of an interaction.
 * It runs before the interaction is handled by a command, preventing execution
 * by throwing an error
 */
export type GuardFunction = (interaction: Interaction) => void

/**
 * A function that generates a {@link GuardFunction}
 */
export type GuardGenerator<Args extends unknown[]> = (
  ...args: Args
) => GuardFunction

/**
 * Utility to help generate a guard decorator.
 *
 * It will run before any interaction and allows you to "guard" execution by throwing an error.
 *
 * For example, a permission guard can be used to check if the user has the required permissions.
 * If they don't, it will throw an error and prevent execution of the command
 * @param guardGenerator A function that takes in the parameters for the guard,
 * and returns another function that accepts the interaction to filter
 * @returns A decorator usable as a guard for some interaction
 * @example
 * ```typescript
 * const guildOnly = makeGuard(...)
 *
 * class MyCommand extends Command {
 *  @guildOnly
 *  run(interaction: Interaction) {}
 * }
 * ```
 */
export function makeGuard<Args extends unknown[]>(
  guardGenerator: GuardGenerator<Args>,
): MethodDecorator<Args, Command> {
  return (...guardArgs: Args) => {
    const guard = guardGenerator(...guardArgs)
    return (
      _target: Command,
      _key: string | symbol,
      descriptor: PropertyDescriptor,
    ) => {
      descriptor.value = function (
        interaction: Interaction,
        ...args: unknown[]
      ) {
        guard(interaction)
        return descriptor.value.apply(this, [interaction, ...args])
      }
    }
  }
}
