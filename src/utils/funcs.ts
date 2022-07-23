/**
 * no-op function, does nothing for when you need a function to not crash
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function noop(..._: unknown[]) {
  // noop
}

/**
 * Typeguard check against null and undefined values
 * @param value The value to check
 * @returns If the value is not null or undefined
 */
export function exists<T>(value: T | null | undefined): value is T {
  return !(value === null || value === undefined)
}
