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
export class PreRunError extends Error {}
