import { AutocompleteHandler } from '../modules/slash/SleetAutocompleteable.js'

export interface StringAutocompleteHandlerOptions {
  array: string[]
  caseSensitive?: boolean
  matcher?: (arrayValue: string, autocompleteValue: string) => boolean
}

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

  return (_interaction, _name, value: string) => {
    const matchValue = caseSensitive ? value.toLowerCase() : value
    return array
      .filter((v) => matcherFn(v, matchValue))
      .map((v) => ({ name: `${v}`, value: v }))
  }
}
