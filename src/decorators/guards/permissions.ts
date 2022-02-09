import { Interaction, PermissionResolvable } from 'discord.js'
import { PreRunError } from '../../errors/PreRunError.js'
import { makeGuard } from './makeGuard.js'

/**
 * Guards a command so that the invoking user requires 1 or more permissions to execute it
 * @param requiredPermissions The permissions required to run the command
 */
export const permissions = makeGuard(
  (requiredPermissions: PermissionResolvable) => (interaction: Interaction) => {
    const { memberPermissions } = interaction

    if (memberPermissions) {
      const missingPermissions = memberPermissions.missing(requiredPermissions)

      if (missingPermissions.length > 0) {
        throw new PreRunError(
          `Missing permissions: ${missingPermissions.join(', ')}`,
        )
      }
    }
  },
)
