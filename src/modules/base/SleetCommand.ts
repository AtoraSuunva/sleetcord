import type { CommandInteraction, PermissionResolvable } from 'discord.js'

import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/rest/v10'
import type { Permissions as PermissionsAsString } from 'discord-api-types/v10'
import { permissionsToStringBitfield } from '../../utils/permissions.js'
import type { RunnableEventHandlers } from '../events.js'
import type { SleetModule } from './SleetModule.js'
import { SleetRunnable } from './SleetRunnable.js'

/**
 * Extra types added to all sleet commands, usually used to add additional "functionality" to commands like accepting one type of input and automatically converting it to what the api wants
 */
export interface SleetCommandExtras {
  /**
   * The default permissions for this command, sent during creation
   *
   * Sleet does NOT use this to validate permissions when running the command, use
   * `{@link hasPermissions}` inside of your commands instead for run-time validation
   *
   * Can be any of:
   *   - Array of `PermissionResolvable` like `["SEND_MESSAGES", "EMBED_LINKS"]`
   *   - A permissions bitfield as a string
   *   - `null`
   */
  default_member_permissions?:
    | PermissionResolvable[]
    | PermissionsAsString
    | null

  /**
   * Locks a command to only be **registered** in a guild if the guild ID is specified.
   *
   * Note that this does **nothing at runtime**, it only prevents `SleetClient#putCommands` from registering it globally or in an unspecified guild.
   *
   * It's still entirely possible to forcefully register a command outside of a specified guild by using `overrideGuildCheck` or a manual API call, if you want/need runtime checks, do them yourself.
   *
   * No specified option means the command is available in all guilds. An empty array means the command is not available anywhere unless forcefully registered
   */
  registerOnlyInGuilds?: string[]
}
export type SleetCommandBody = RESTPostAPIApplicationCommandsJSONBody
export type SleetCommandExtendedBody = SleetCommandBody & SleetCommandExtras

/**
 * A command usable by the Sleet client. This one handles any generic "command" that comes in,
 * from slash/application to user command to message command or any else that appear
 *
 * This class contains all common functionality and ensures proper and consistent typing between them all
 * for the Sleet client to correctly route incoming interactions
 *
 * You shouldn't need to directly use this, you're likely looking for {@link SleetSlashCommand}, {@link SleetUserCommand}, or {@link SleetMessageCommand}.
 *
 * If you're looking to write a module that adds event handlers but doesn't require any interaction, use {@link SleetModule}.
 */
export class SleetCommand<
  I extends CommandInteraction = CommandInteraction,
  A extends unknown[] = [],
  Handlers extends RunnableEventHandlers<I, A> = RunnableEventHandlers<I, A>,
> extends SleetRunnable<
  RESTPostAPIApplicationCommandsJSONBody,
  I,
  A,
  Handlers
> {
  public registerOnlyInGuilds?: string[]

  constructor(
    body: SleetCommandBody,
    handlers: Handlers,
    modules?: SleetModule[],
  )
  constructor(
    body: SleetCommandExtendedBody,
    handlers: Handlers,
    modules: SleetModule[] = [],
  ) {
    const { default_member_permissions, registerOnlyInGuilds } = body

    body.default_member_permissions = permissionsToStringBitfield(
      default_member_permissions ?? null,
    )

    delete body.registerOnlyInGuilds

    super(body, handlers, modules)

    if (registerOnlyInGuilds) {
      this.registerOnlyInGuilds = registerOnlyInGuilds
    }
  }
}
