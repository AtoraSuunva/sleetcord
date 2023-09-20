import { Interaction, TeamMemberMembershipState, User } from 'discord.js'
import { PreRunError } from '../errors/PreRunError.js'

/**
 * Check the user the interaction came from to make sure that they're the bot owner or a member of the bot's team.
 *
 * Causes the bot application to be fetched, if not fetched already
 * @param interaction The interaction to check
 * @returns If the interaction came from the owner of the bot
 * @throws {PreRunError} If the application can't be fetched
 */
export async function isOwnerGuard(interaction: Interaction) {
  if (!(await isOwner(interaction.user))) {
    throw new PreRunError('Only the bot owner or a team member can do that')
  }
}

/**
 * Check if a user is a bot owner or a member of the bot's team
 * @param user The user to check
 * @returns If the user is the bot owner or team member
 * @throws {PreRunError} If the application can't be fetched
 */
export async function isOwner(user: User): Promise<boolean> {
  if (!user.client.application.owner) {
    await user.client.application.fetch()
  }

  const owner = user.client.application.owner

  if (owner === null) {
    throw new PreRunError('Failed to fetch application')
  }

  if (owner instanceof User) {
    return user.id === owner.id
  }

  return owner.members.some(
    (member) =>
      member.membershipState === TeamMemberMembershipState.Accepted &&
      user.id === member.user.id,
  )
}
