import {
  type APIGuildMember,
  type APIUser,
  type EscapeMarkdownOptions,
  type GuildMember,
  type PartialGuildMember,
  type PartialUser,
  type User,
  escapeMarkdown,
} from 'discord.js'

// See https://www.w3.org/International/articles/inline-bidi-markup/index#nomarkup
// tl;dr: First character tells the text renderer "consider the upcoming text isolated" and the second says "this is the end of the isolated section"
const FIRST_STRONG_ISOLATE = '\u{2068}'
const POP_DIRECTIONAL_ISOLATE = '\u{2069}'

export interface FormatUserOptions {
  /** Show the user's ID after their tag (default: true) */
  id?: boolean
  /** Show the username in bold (default: true) */
  markdown?: boolean
  /** Mention the user at the end of the formatted string (default: false) */
  mention?: boolean
  /** Insert a First Strong Isolate and a Pop Directional Isolate around the username (default: true) */
  bidirectional?: boolean
  /** Show the user's global name + username (default: true) */
  globalName?: boolean
  /** Escape the user's username/global name (default: true) */
  escapeMarkdown?: boolean
  /** Wrap the user ID in backticks so it can be copied by tapping on mobile, disabled if markdown: false (default: true) */
  codeID?: boolean
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
 * ```js
 * // No Global Name:
 * **↦username↤** (id) <@user>
 *
 * // With Global Name
 * ↦Global Name↤ [**↦username↤**] (`id`) <@user>
 * ```
 *
 * Username is either old-style `**username**#discriminator` or new-style `**username**`
 *
 * A First Strong Isolate character (denoted by `↦`) and a Pop Directional Isolate character (denoted by `↤`) are inserted to prevent RTL characters from messing up the rest of the string.
 *
 * See w3.org's [article on bidi markup](https://www.w3.org/International/articles/inline-bidi-markup/index#nomarkup) for technical information
 *
 * @example
 * formatUser(atorasuunva)
 * // ↦Atora↤ [**↦atorasuunva↤**] (`74768773940256768`)
 *
 * formatUser(atorasuunva, { mention: true })
 * // ↦Atora↤ [**↦atorasuunva↤**] (`74768773940256768`) <@74768773940256768>
 *
 * @param userLike A User or GuildMember to format (Partial and API Users/Members are accepted, but output quality depends on what they contain)
 * @param params How to format the user
 * @returns A formatted string for the user
 */
export function formatUser(
  userLike:
    | User
    | GuildMember
    | PartialUser
    | PartialGuildMember
    | APIUser
    | APIGuildMember,
  {
    id = true,
    markdown = true,
    mention = false,
    bidirectional = true,
    escapeMarkdown = true,
    codeID = true,
    format = (_, str) => str,
  }: FormatUserOptions = {},
): string {
  // TODO: detect partial users and fetch them? can't do without changing function to be async, might break things...
  const user = 'user' in userLike ? userLike.user : userLike

  if (!('username' in user)) {
    // APIGuildMember with no .user, try our best
    const u = user as unknown as Record<string, string>
    return `${u.nick ? `${u.nick} ` : ''}<unknown guild member>`
  }

  const formatted: string[] = []
  const username =
    escapeMarkdown && user.username
      ? escapeAllMarkdown(user.username)
      : user.username

  const globalName = 'globalName' in user ? user.globalName : user.global_name

  if (globalName) {
    const escapedGlobalName = escapeMarkdown
      ? escapeAllMarkdown(globalName)
      : globalName

    if (bidirectional) formatted.push(FIRST_STRONG_ISOLATE)
    formatted.push(format('globalName', escapedGlobalName) ?? '')
    if (bidirectional) formatted.push(POP_DIRECTIONAL_ISOLATE)
    formatted.push(' [')
  }

  if (markdown) formatted.push('**')
  if (bidirectional) formatted.push(FIRST_STRONG_ISOLATE)
  formatted.push(format('username', username) ?? '<unknown>')
  if (bidirectional) formatted.push(POP_DIRECTIONAL_ISOLATE)
  if (markdown) formatted.push('**')
  if (user.discriminator && user.discriminator !== '0')
    formatted.push(`#${format('discriminator', user.discriminator)}`)

  if (globalName) {
    formatted.push(']')
  }

  if (id) {
    const idString = format('id', user.id)
    formatted.push(codeID && markdown ? ` (\`${idString}\`)` : ` (${idString})`)
  }
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
