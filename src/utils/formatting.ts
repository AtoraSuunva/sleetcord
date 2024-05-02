import {
  EscapeMarkdownOptions,
  GuildMember,
  User,
  escapeMarkdown,
} from 'discord.js'

/**
 * Left-to-Right mark, changes rendered text direction
 */
const LRM_MARK = `\u{200e}`

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
  escape?: boolean
}

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
  userLike: User | GuildMember,
  {
    id = true,
    markdown = true,
    mention = false,
    bidirectional = true,
    escape = true,
  }: FormatUserOptions = {},
): string {
  // TODO: detect partial users and fetch them? can't do without changing function to be async, might break things...
  const user = userLike instanceof GuildMember ? userLike.user : userLike
  const formatted: string[] = []
  const username =
    escape && user.username ? escapeAllMarkdown(user.username) : user.username

  if (user.globalName) {
    const globalName = escape
      ? escapeAllMarkdown(user.globalName)
      : user.globalName

    formatted.push(globalName)
    if (bidirectional) formatted.push(LRM_MARK)
    formatted.push(' [')
  }

  if (markdown) formatted.push('**')
  formatted.push(username ?? '<unknown>')
  if (markdown) formatted.push('**')
  if (bidirectional) formatted.push(LRM_MARK)
  if (user.discriminator !== '0') formatted.push(`#${user.discriminator}`)

  if (user.globalName) {
    formatted.push(']')
  }

  if (id) formatted.push(` (${user.id})`)
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
