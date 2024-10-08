import type { AutocompleteHandler } from '../modules/slash/SleetAutocompleteable.js'

export interface StringAutocompleteHandlerOptions {
  /**
   * The array of strings to match against
   */
  array: string[]
  /**
   * Whether or not to match case sensitively
   * @default true
   */
  caseSensitive?: boolean
  /**
   * A custom matcher function to use instead of the default
   * @param arrayValue The value from the array
   * @param autocompleteValue The value from the autocomplete request
   * @returns If the array value be included in the autocomplete response
   * @default arrayValue.includes(autocompleteValue)
   */
  matcher?: (arrayValue: string, autocompleteValue: string) => boolean
}

/**
 * Creates an autocomplete function that will match incoming autocomplete requests against an array of strings and return possible matches
 *
 * Useful if you have a set of choices you just want as suggestions, dynamic choices that may change on bot start, or choices that don't fit an interaction's `choices` option
 * @param autocompleteOptions The options for this autocomplete
 * @returns A function that can be passed to an option's `autocomplete` to autocomplete
 */
export function autocompleteForStrings(
  { array, caseSensitive, matcher }: StringAutocompleteHandlerOptions = {
    array: [],
    caseSensitive: true,
  },
): AutocompleteHandler<string> {
  const matcherFn =
    matcher ??
    (caseSensitive
      ? (a, b) => a.includes(b.toLowerCase())
      : (a, b) => a.includes(b))

  return ({ value }) => {
    const matchValue = caseSensitive ? value.toLowerCase() : value
    return array
      .filter((v) => matcherFn(v, matchValue))
      .map((v) => ({ name: `${v}`, value: v }))
  }
}
