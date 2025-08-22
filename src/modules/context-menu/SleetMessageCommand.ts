import type {
  Awaitable,
  MessageContextMenuCommandInteraction,
} from 'discord.js'
import {
  ApplicationCommandType,
  type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord-api-types/v10'
import { SleetCommand, type SleetCommandExtras } from '../base/SleetCommand.js'
import type { RunnableEventHandlers, SleetContext } from '../events.js'
import type { SleetModule } from '../index.js'

type BaseMessageCommandBody = Omit<
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
  'type' | keyof SleetCommandExtras
> &
  SleetCommandExtras

export interface SleetMessageCommandBody extends BaseMessageCommandBody {
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
  constructor(
    body: SleetMessageCommandBody,
    handlers: MessageCommandHandlers,
    modules: SleetModule[] = [],
  ) {
    body.type = ApplicationCommandType.Message

    super(
      body as RESTPostAPIContextMenuApplicationCommandsJSONBody,
      handlers,
      modules,
    )
  }

  override run(
    context: SleetContext,
    interaction: MessageContextMenuCommandInteraction,
  ): Awaitable<unknown> {
    const { targetMessage } = interaction
    return super.run(context, interaction, targetMessage)
  }
}
