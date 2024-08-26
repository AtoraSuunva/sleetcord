import {
  type EscapeMarkdownOptions,
  type GuildMember,
  type PartialGuildMember,
  type PartialUser,
  type User,
  escapeMarkdown,
} from 'discord.js'

/**
 * Left-to-Right mark, changes rendered text direction
 */
const LRM_MARK = '\u{200e}'

export interface FormatUserOptions {
  /** Show the user's ID after their tag (default: true) */
  id?: boolean
  /** Show the username in bold (default: true) */
  markdown?: boolean
  /** Mention the user at the end of the formatted string (default: false) */
  mention?: boolean
  /** Insert a left-to-right mark after the username (default: true) */
  bidirectional?: boolean
  /** Show the user's global name + username (default: true) */
  globalName?: boolean
  /** Escape the user's username/global name (default: true) */
  escapeMarkdown?: boolean
  /**
   * Usable to apply custom formatting to specific parts
   *
   * @param part Identifies which part of the user is being formatted
   * @param str The part, without any formatting or surrounding characters (i.e. `username` instead of `[**username**]`)
   */
  format?: FormatUserPart
}

export type UserPart = 'globalName' | 'discriminator' | 'username' | 'id'
/**
 * @param part Identifies which part of the user is being formatted
 * @param str The part, without any formatting or surrounding characters (i.e. `username` instead of `[**username**]`)
 */
export type FormatUserPart = (
  part: UserPart,
  str: string | null,
) => string | null

/**
 * Formats a user in the following way:
 *
 * **No global name**: `username↦ (id) <@user>`
 *
 * **With global name**: `Global Name↦ [username↦] (id) <@user>`
 *
 * Username is either old-style `**username**#discriminator` or new-style `**username**`
 *
 * Left-to-Right marks (denoted by `↦`) are inserted prevent RTL characters from messing up the rest of the string
 *
 * @param userLike A User or GuildMember to format
 * @param params How to format the user
 * @returns A formatted string for the user
 */
export function formatUser(
  userLike: User | GuildMember | PartialUser | PartialGuildMember,
  {
    id = true,
    markdown = true,
    mention = false,
    bidirectional = true,
    escapeMarkdown = true,
    format = (_, str) => str,
  }: FormatUserOptions = {},
): string {
  // TODO: detect partial users and fetch them? can't do without changing function to be async, might break things...
  const user = 'user' in userLike ? userLike.user : userLike
  const formatted: string[] = []
  const username =
    escapeMarkdown && user.username
      ? escapeAllMarkdown(user.username)
      : user.username

  if (user.globalName) {
    const globalName = escapeMarkdown
      ? escapeAllMarkdown(user.globalName)
      : user.globalName

    formatted.push(format('globalName', globalName) ?? '')
    if (bidirectional) formatted.push(LRM_MARK)
    formatted.push(' [')
  }

  if (markdown) formatted.push('**')
  formatted.push(format('username', username) ?? '<unknown>')
  if (markdown) formatted.push('**')
  if (bidirectional) formatted.push(LRM_MARK)
  if (user.discriminator && user.discriminator !== '0')
    formatted.push(`#${format('discriminator', user.discriminator)}`)

  if (user.globalName) {
    formatted.push(']')
  }

  if (id) formatted.push(` (${format('id', user.id)})`)
  if (mention) formatted.push(` <@${user.id}>`)

  return formatted.join('')
}

/**
 * A version of Discord.js' `escapeMarkdown` that escapes all markdown by default
 *
 * As of D.js v14.13.0 (sha 23e0ac5), the following markdown is not escaped by default:
 * - headings
 * - bulleted lists
 * - numbered lists
 * - masked links
 * @param text The text to escape
 * @param options Options for what markdown to escape in the string, default all
 * @returns The string with markdown escaped
 */
export function escapeAllMarkdown(
  text: string,
  options?: EscapeMarkdownOptions,
) {
  return escapeMarkdown(text, {
    heading: true,
    bulletedList: true,
    numberedList: true,
    maskedLink: true,
    ...options,
  })
}
