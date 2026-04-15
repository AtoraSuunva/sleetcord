import {
  ApplicationCommandType,
  type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord-api-types/v10'
import type { Awaitable, MessageContextMenuCommandInteraction } from 'discord.js'

import { SleetCommand, type SleetCommandExtras } from '../base/SleetCommand.ts'
import type { RunnableEventHandlers, SleetContext } from '../events.ts'
import type { SleetModuleOptions } from '../index.ts'

type BaseMessageCommandBody = Omit<
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
  'type' | keyof SleetCommandExtras
> &
  SleetCommandExtras

/**
 * The body of a SleetMessageCommand, which is the same as other context menu commands but with enforced an type of ApplicationCommandType.Message (or omitted)
 */
export interface SleetMessageCommandBody extends BaseMessageCommandBody {
  /** The type of the command, which is always ApplicationCommandType.Message */
  type?: ApplicationCommandType.Message
}

/**
 * The target message that was right-clicked to trigger a SleetMessageCommand
 */
export type InteractionMessage = MessageContextMenuCommandInteraction['targetMessage']

/**
 * The handlers for a SleetMessageCommand, which receive the interaction and the message that was right-clicked as arguments. See {@link SleetMessageCommand} for more details on message context menu commands and how to use them.
 */
export interface MessageCommandHandlers extends RunnableEventHandlers<
  MessageContextMenuCommandInteraction,
  [InteractionMessage]
> {
  /**
   * The run handler for a SleetMessageCommand, which is called when the command is invoked. Receives the interaction and the message that was right-clicked as arguments.
   */
  run: (
    interaction: MessageContextMenuCommandInteraction,
    message: InteractionMessage,
  ) => Awaitable<unknown>
}

/**
 * A Sleet Module that defines a message context menu command, which appears when right-clicking a message in Discord. The command's handlers receive the interaction and the message that was right-clicked as arguments.
 */
export class SleetMessageCommand extends SleetCommand<
  MessageContextMenuCommandInteraction,
  [InteractionMessage],
  MessageCommandHandlers
> {
  constructor(
    body: SleetMessageCommandBody,
    handlers: MessageCommandHandlers,
    options: SleetModuleOptions = {},
  ) {
    body.type = ApplicationCommandType.Message

    super(body as RESTPostAPIContextMenuApplicationCommandsJSONBody, handlers, options)
  }

  /**
   * A run handler that extracts the target message from the interaction and passes it to the user-defined run handler.
   */
  override run(
    context: SleetContext,
    interaction: MessageContextMenuCommandInteraction,
  ): Awaitable<unknown> {
    const { targetMessage } = interaction
    return super.run(context, interaction, targetMessage)
  }
}
