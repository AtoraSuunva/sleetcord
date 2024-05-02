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

/**
 * Partition an array into chunks of a specific size. Useful if you have 1000 items and want to process them in chunks of 100.
 * @param array The array to partition
 * @param chunkSize The size of each chunk to return
 */
export function* partitionArray<T>(
  array: T[],
  chunkSize: number,
): Generator<T[], void, void> {
  for (let i = 0; i < array.length; i += chunkSize) {
    yield array.slice(i, i + chunkSize)
  }
}
