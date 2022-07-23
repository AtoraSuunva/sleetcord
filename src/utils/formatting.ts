import { escapeMarkdown, GuildMember, User } from 'discord.js'

export interface FormatUserOptions {
  /** Show the user's ID after their tag */
  id?: boolean
  /** Show the username in bold */
  markdown?: boolean
  /** Mention the user at the end of the formatted string */
  mention?: boolean
  /** Insert a left-to-right mark after the username */
  bidirectional?: boolean
}

/**
 * Formats a user in following way:
 *
 *   `**Username**#1234 (id)`
 *
 * A Left-to-Right mark is inserted after the username to prevent RTL usernames from messing up the rest of the string
 * @param userLike A User or GuildMember to format
 * @param param1 How to format the user
 * @returns A formatted string for the user
 */
export function formatUser(
  userLike: User | GuildMember,
  {
    id = true,
    markdown = true,
    mention = false,
    bidirectional = true,
  }: FormatUserOptions = {},
): string {
  const user = userLike instanceof GuildMember ? userLike.user : userLike

  const formatted: string[] = []

  if (markdown) formatted.push('**')
  formatted.push(escapeMarkdown(user.username))
  if (markdown) formatted.push('**')
  if (bidirectional) formatted.push('\u{200e}')
  formatted.push(`#${user.discriminator}`)
  if (id) formatted.push(` (${user.id})`)
  if (mention) formatted.push(` <@${user.id}>`)

  return formatted.join('')
}
