import { Interaction, PermissionResolvable } from 'discord.js'
import { PreRunError } from '../errors/PreRunError.js'

export function hasPermissions(
  interaction: Interaction,
  requiredPermissions: PermissionResolvable[],
) {
  const { memberPermissions } = interaction

  if (memberPermissions) {
    const missingPermissions = memberPermissions.missing(requiredPermissions)

    if (missingPermissions.length > 0) {
      throw new PreRunError(
        `Missing permissions: ${missingPermissions.join(', ')}`,
      )
    }
  }
}
