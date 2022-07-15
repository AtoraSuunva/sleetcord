import { APIApplicationCommandOptionChoice } from 'discord-api-types/v10'

/**
 * Can be used to format an array of choices like `['a', 'b', 'c']` to `[{name: 'a', value: 'a'}...]` if you want the name and value to be identical
 * @param choices The choices for an option
 * @returns An array of objects that can be used for a command option
 */
export function makeChoices<T extends string | number>(
  choices: T[],
): APIApplicationCommandOptionChoice<T>[] {
  return choices.map((choice) => ({
    name: choice.toString(),
    value: choice,
  }))
}
