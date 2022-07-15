import { Interaction, PermissionResolvable } from 'discord.js'
import { PreRunError } from '../errors/PreRunError.js'

export function hasPermissions(
  interaction: Interaction,
  requiredPermissions: PermissionResolvable[],
) {
  if (!interaction.inGuild()) return
  const { memberPermissions } = interaction

  const missingPermissions = memberPermissions.missing(requiredPermissions)

  if (missingPermissions.length > 0) {
    throw new PreRunError(
      `You're missing these permissions: ${missingPermissions.join(', ')}`,
    )
  }
}

export function botHasPermissions(
  interaction: Interaction,
  requiredPermissions: PermissionResolvable[],
) {
  if (!interaction.inGuild()) return
  const myPermissions = interaction.guild?.me?.permissions
  // Honestly how
  if (!myPermissions) throw new PreRunError('Could not get my permissions')

  const missingPermissions = myPermissions.missing(requiredPermissions)

  if (missingPermissions.length > 0) {
    throw new PreRunError(
      `I'm missing these permissions: ${missingPermissions.join(', ')}`,
    )
  }
}
