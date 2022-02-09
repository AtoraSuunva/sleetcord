import { Interaction } from 'discord.js'
import { PreRunError } from '../../errors/PreRunError.js'
import { makeGuard } from './makeGuard.js'

/**
 * Guards a command so that it can only run inside of a guild
 */
export const guildOnly = makeGuard(() => (interaction: Interaction) => {
  if (!interaction.inGuild()) {
    throw new PreRunError('This command can only be run in a guild')
  }
})
