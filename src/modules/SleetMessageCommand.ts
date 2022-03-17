import {
  ApplicationCommandType,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord-api-types/v9'
import {
  Awaitable,
  CommandInteractionOption,
  MessageContextMenuInteraction,
} from 'discord.js'
import { CommandEventHandlers, SleetCommand } from './SleetCommand.js'

type MessageApplicationCommandJSONBody =
  RESTPostAPIContextMenuApplicationCommandsJSONBody & {
    type?: ApplicationCommandType.Message
  }

type InteractionMessage = NonNullable<CommandInteractionOption['message']>

export interface MessageCommandHandlers
  extends CommandEventHandlers<
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

  override run(interaction: MessageContextMenuInteraction): Awaitable<unknown> {
    const { targetMessage } = interaction
    return super.run(interaction, targetMessage)
  }
}
