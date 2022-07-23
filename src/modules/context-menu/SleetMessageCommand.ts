import {
  ApplicationCommandType,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord-api-types/v10'
import { Awaitable, MessageContextMenuCommandInteraction } from 'discord.js'
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

export type InteractionMessage =
  MessageContextMenuCommandInteraction['targetMessage']

export interface MessageCommandHandlers
  extends RunnableEventHandlers<
    MessageContextMenuCommandInteraction,
    [InteractionMessage]
  > {
  run: (
    interaction: MessageContextMenuCommandInteraction,
    message: InteractionMessage,
  ) => Awaitable<unknown>
}

export class SleetMessageCommand extends SleetCommand<
  MessageContextMenuCommandInteraction,
  [InteractionMessage],
  MessageCommandHandlers
> {
  constructor(body: SleetMessageCommandBody, handlers: MessageCommandHandlers) {
    body.type = ApplicationCommandType.Message
    super(body as RESTPostAPIContextMenuApplicationCommandsJSONBody, handlers)
  }

  override run(
    context: SleetContext,
    interaction: MessageContextMenuCommandInteraction,
  ): Awaitable<unknown> {
    const { targetMessage } = interaction
    return super.run(context, interaction, targetMessage)
  }
}
