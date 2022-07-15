import {
  ApplicationCommandType,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord-api-types/v10'
import {
  Awaitable,
  CommandInteractionOption,
  User,
  UserContextMenuInteraction,
} from 'discord.js'
import { SleetCommand } from '../base/SleetCommand.js'
import { RunnableEventHandlers, SleetContext } from '../events.js'

type UserApplicationCommandJSONBody = Omit<
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
  'type'
> & {
  type?: ApplicationCommandType.User
}

export type InteractionMember = NonNullable<
  CommandInteractionOption['member']
> | null

export interface UserCommandHandlers
  extends RunnableEventHandlers<
    UserContextMenuInteraction,
    [User, InteractionMember]
  > {
  run: (
    interaction: UserContextMenuInteraction,
    user: User,
    member: InteractionMember,
  ) => Awaitable<unknown>
}

export class SleetUserCommand extends SleetCommand<
  UserContextMenuInteraction,
  [User, InteractionMember],
  UserCommandHandlers
> {
  constructor(
    body: UserApplicationCommandJSONBody,
    handlers: UserCommandHandlers,
  ) {
    body.type = ApplicationCommandType.User
    super(body, handlers)
  }

  override run(
    context: SleetContext,
    interaction: UserContextMenuInteraction,
  ): Awaitable<unknown> {
    const { targetUser, targetMember } = interaction
    return super.run(context, interaction, targetUser, targetMember)
  }
}
