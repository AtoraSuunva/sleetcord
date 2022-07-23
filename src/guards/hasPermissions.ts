import {
  CommandInteraction,
  Interaction,
  PermissionResolvable,
} from 'discord.js'
import { PreRunError } from '../errors/PreRunError.js'
import { getGuild } from '../index.js'

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

export async function botHasPermissions(
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
