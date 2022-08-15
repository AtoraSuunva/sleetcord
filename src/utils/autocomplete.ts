import { AutocompleteHandler } from '../modules/slash/SleetAutocompleteable.js'

export interface StringAutocompleteHandlerOptions {
  array: string[]
  caseSensitive?: boolean
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
