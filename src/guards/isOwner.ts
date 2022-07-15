import { Interaction } from 'discord.js'
import { PreRunError } from '../errors/PreRunError.js'

/**
 * Check the user the interaction came from to make sure that they're the bot owner.
 *
 * Causes the bot application to be fetched, if not fetched already
 * @param interaction The interaction to check
 * @returns If the interaction came from the owner of the bot
 */
export async function isOwner(interaction: Interaction) {
  if (typeof interaction.client.application?.owner?.id !== 'string') {
    await interaction.client.application?.fetch()
  }

  const ownerID = interaction.client.application?.owner?.id

  if (!ownerID) {
    throw new PreRunError('Failed to fetch application')
  }

  if (interaction.user.id !== ownerID) {
    throw new PreRunError('Only the bot owner can do this')
  }
}
