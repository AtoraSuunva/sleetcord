import { Interaction, PermissionResolvable } from 'discord.js'
import { Command } from '../../commands/Command.js'
import { PreRunError } from '../../errors/PreRunError.js'

export const permissions =
  (requiredPermissions: PermissionResolvable) =>
  (_target: Command, _key: string, propertyDescriptor: PropertyDescriptor) => {
    const originalMethod = propertyDescriptor.value

    propertyDescriptor.value = function (
      interaction: Interaction,
      ...args: unknown[]
    ) {
      const { memberPermissions } = interaction

      if (memberPermissions) {
        const missingPermissions =
          memberPermissions.missing(requiredPermissions)

        if (missingPermissions.length > 0) {
          throw new PreRunError(
            `Missing required permissions: ${missingPermissions.join(', ')}`,
          )
        }
      }

      return originalMethod.apply(this, [interaction, ...args])
    }
  }
