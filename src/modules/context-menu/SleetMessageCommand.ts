import {
  ApplicationCommandType,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord-api-types/v10'
import { Awaitable, MessageContextMenuInteraction } from 'discord.js'
import { SleetCommand, SleetCommandExtras } from '../base/SleetCommand.js'
import { RunnableEventHandlers, SleetContext } from '../events.js'

type BaseCommandBody = Omit<
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
  'type' | keyof SleetCommandExtras
> &
  SleetCommandExtras

interface SleetMessageCommandBody extends BaseCommandBody {
  type?: ApplicationCommandType.Message
}

export type InteractionMessage = MessageContextMenuInteraction['targetMessage']

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
  constructor(body: SleetMessageCommandBody, handlers: MessageCommandHandlers) {
    body.type = ApplicationCommandType.Message
    super(body as RESTPostAPIContextMenuApplicationCommandsJSONBody, handlers)
  }

  override run(
    context: SleetContext,
    interaction: MessageContextMenuInteraction,
  ): Awaitable<unknown> {
    const { targetMessage } = interaction
    return super.run(context, interaction, targetMessage)
  }
}
