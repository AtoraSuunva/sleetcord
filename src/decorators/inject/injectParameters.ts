import { CommandInteraction } from 'discord.js'
import { GetMetadata } from './getters.js'
import { Command } from '../../commands/Command.js'

export const injectParameters =
  () =>
  (target: Command, _key: string, propertyDescriptor: PropertyDescriptor) => {
    const keys = Reflect.getOwnMetadataKeys(target)

    const parseParams = keys
      .filter((key) => key.startsWith('get:'))
      .map((key) => Reflect.getOwnMetadata(key, target) as GetMetadata)

    const originalMethod = propertyDescriptor.value

    propertyDescriptor.value = function (
      interaction: CommandInteraction,
      ...args: unknown[]
    ) {
      for (const parse of parseParams) {
        const { name, index, required, type, getter } = parse
        const value = getter(interaction, name, required, type)
        const missingValue = value === undefined || value === null

        if (required && missingValue) {
          throw new Error(`Missing required option in interaction "${name}"`)
        }

        if (!missingValue) {
          args[index - 1] = value
        }
      }

      return originalMethod.apply(this, [interaction, ...args])
    }
  }
