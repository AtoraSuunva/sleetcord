/**
 * An error when a pre-run check for a command fails
 *
 * These checks are typically permission checks, in-guild checks, or owner checks
 *
 * @example
 * if (!interaction.memberPermissions.has('BAN_MEMBERS')) {
 *  throw new PreRunError('You need the BAN_MEMBERS permission!')
 * }
 */
export class PreRunError extends Error {
  // The Error constructor is actually used here, not sure why eslint is catching it
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(message: string) {
    super(message)
  }
}
