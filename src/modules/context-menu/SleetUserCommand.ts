import {
  ApplicationCommandType,
  type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord-api-types/v10'
import type {
  Awaitable,
  CommandInteractionOption,
  User,
  UserContextMenuCommandInteraction,
} from 'discord.js'

import { SleetCommand, type SleetCommandExtras } from '../base/SleetCommand.ts'
import type { RunnableEventHandlers, SleetContext } from '../events.ts'

type BaseUserCommandBody = Omit<
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
  'type' | keyof SleetCommandExtras
> &
  SleetCommandExtras

export interface SleetUserCommandBody extends BaseUserCommandBody {
  /**
   * The type of the application command, which is always `ApplicationCommandType.User` for user context menu commands.
   */
  type?: ApplicationCommandType.User
}

/**
 * Represents the member associated with a user context menu command interaction. Can be null when the command is used in a DM or when the target user is not a member of the guild where the command was used.
 */
export type InteractionMember = NonNullable<CommandInteractionOption['member']> | null

/**
 * Represents the handlers for a user context menu command. The `run` handler will receive the target user and member (if applicable) as arguments.
 */
export interface UserCommandHandlers extends RunnableEventHandlers<
  UserContextMenuCommandInteraction,
  [User, InteractionMember]
> {
  /**
   * Run the user context menu command, which will be called with the target user and member (if applicable) as arguments.
   * @param interaction The interaction that triggered the command
   * @param user The target user of the context menu command
   * @param member The member associated with the target user, or null if the command was used in a DM or the target user is not a member of the guild where the command was used
   * @returns The result of the ran handler, if any
   */
  run: (
    interaction: UserContextMenuCommandInteraction,
    user: User,
    member: InteractionMember,
  ) => Awaitable<unknown>
}

/**
 * Represents a user context menu command, which is a type of application command that appears in the context menu when right-clicking a user. The handler for this command will receive the target user and member (if applicable) as arguments.
 */
export class SleetUserCommand extends SleetCommand<
  UserContextMenuCommandInteraction,
  [User, InteractionMember],
  UserCommandHandlers
> {
  constructor(body: SleetUserCommandBody, handlers: UserCommandHandlers) {
    body.type = ApplicationCommandType.User
    super(body as RESTPostAPIContextMenuApplicationCommandsJSONBody, handlers)
  }

  /**
   * Run the user context menu command, which will call the registered handler with the target user and member (if applicable) as arguments.
   *
   * @param context The context of the command execution, which includes information about the client, guild, channel, and more
   * @param interaction The interaction that triggered the command
   * @returns The result of the ran handler, if any
   */
  override run(
    context: SleetContext,
    interaction: UserContextMenuCommandInteraction,
  ): Awaitable<unknown> {
    const { targetUser, targetMember } = interaction
    return super.run(context, interaction, targetUser, targetMember)
  }
}
