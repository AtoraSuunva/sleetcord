import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/rest/v10'
import { Permissions as PermissionsAsString } from 'discord-api-types/v10'
import { CommandInteraction, PermissionResolvable } from 'discord.js'
import { permissionsToStringBitfield } from '../../utils/permissions.js'
import { RunnableEventHandlers } from '../events.js'
import { SleetRunnable } from './SleetRunnable.js'

/**
 * Extra types added to all sleet commands, usually used to add additional "functionality" to commands like accepting one type of input and automatically converting it to what the api wants
 */
export type SleetCommandExtras = {
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
}

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
  constructor(
    public override body: RESTPostAPIApplicationCommandsJSONBody,
    handlers: Handlers,
  ) {
    body.default_member_permissions = permissionsToStringBitfield(
      body.default_member_permissions ?? null,
    )

    super(body, handlers)
  }
}
