import { Interaction } from 'discord.js'
import { Command } from '../../commands/Command.js'
import { PreRunError } from '../../errors/PreRunError.js'

export const guildOnly =
  () =>
  (_target: Command, _key: string, propertyDescriptor: PropertyDescriptor) => {
    const originalMethod = propertyDescriptor.value

    propertyDescriptor.value = function (
      interaction: Interaction,
      ...args: unknown[]
    ) {
      if (!interaction.inGuild()) {
        throw new PreRunError('You need to run this command in a server.')
      }

      return originalMethod.apply(this, [interaction, ...args])
    }
  }
