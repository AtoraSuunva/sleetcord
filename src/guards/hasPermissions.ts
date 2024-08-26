import type {
  CommandInteraction,
  Interaction,
  PermissionResolvable,
} from 'discord.js'
import { PreRunError } from '../errors/PreRunError.js'
import { getGuild } from '../index.js'

/**
 * Checks if the member who initiated the interaction has the required permissions
 * @param interaction The interaction to check
 * @param requiredPermissions The permissions to check
 * @throws {PreRunError} If the member doesn't have the required permissions, listing the missing permissions
 */
export function hasPermissionsGuard(
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

/**
 * Checks if the bot has the required permissions
 * @param interaction The interaction to check
 * @param requiredPermissions The permissions to check
 * @throws {PreRunError} If the bot doesn't have the required permissions, listing the missing permissions
 */
export async function botHasPermissionsGuard(
  interaction: CommandInteraction,
  requiredPermissions: PermissionResolvable[],
) {
  if (!interaction.inGuild()) return
  const guild = await getGuild(interaction, true)
  const me = await guild.members.fetchMe()
  const myPermissions = me.permissions

  const missingPermissions = myPermissions.missing(requiredPermissions)

  if (missingPermissions.length > 0) {
    throw new PreRunError(
      `I'm missing these permissions: ${missingPermissions.join(', ')}`,
    )
  }
}
