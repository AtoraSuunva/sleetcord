import {
  ApplicationCommandType,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord-api-types/v9'
import {
  Awaitable,
  CommandInteractionOption,
  MessageContextMenuInteraction,
} from 'discord.js'
import { SleetCommand } from '../base/SleetCommand.js'
import { RunnableEventHandlers, SleetContext } from '../events.js'

type MessageApplicationCommandJSONBody =
  RESTPostAPIContextMenuApplicationCommandsJSONBody & {
    type?: ApplicationCommandType.Message
  }

type InteractionMessage = NonNullable<CommandInteractionOption['message']>

export interface MessageCommandHandlers
  extends RunnableEventHandlers<
    MessageContextMenuInteraction,
    [InteractionMessage]
  > {
  run: (
    interaction: MessageContextMenuInteraction,
    message: InteractionMessage,
  ) => Awaitable<unknown>
}

export class SleetMessageCommand extends SleetCommand<
  MessageContextMenuInteraction,
  [InteractionMessage],
  MessageCommandHandlers
> {
  constructor(
    body: MessageApplicationCommandJSONBody,
    handlers: MessageCommandHandlers,
  ) {
    body.type = ApplicationCommandType.Message
    super(body, handlers)
  }

  override run(
    context: SleetContext,
    interaction: MessageContextMenuInteraction,
  ): Awaitable<unknown> {
    const { targetMessage } = interaction
    return super.run(context, interaction, targetMessage)
  }
}
