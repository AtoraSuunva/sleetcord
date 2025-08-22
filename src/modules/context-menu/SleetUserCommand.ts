import type {
  Awaitable,
  CommandInteractionOption,
  User,
  UserContextMenuCommandInteraction,
} from 'discord.js'
import {
  ApplicationCommandType,
  type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord-api-types/v10'
import { SleetCommand, type SleetCommandExtras } from '../base/SleetCommand.js'
import type { RunnableEventHandlers, SleetContext } from '../events.js'

type BaseUserCommandBody = Omit<
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
  'type' | keyof SleetCommandExtras
> &
  SleetCommandExtras

export interface SleetUserCommandBody extends BaseUserCommandBody {
  type?: ApplicationCommandType.User
}

export type InteractionMember = NonNullable<
  CommandInteractionOption['member']
> | null

export interface UserCommandHandlers
  extends RunnableEventHandlers<
    UserContextMenuCommandInteraction,
    [User, InteractionMember]
  > {
  run: (
    interaction: UserContextMenuCommandInteraction,
    user: User,
    member: InteractionMember,
  ) => Awaitable<unknown>
}

export class SleetUserCommand extends SleetCommand<
  UserContextMenuCommandInteraction,
  [User, InteractionMember],
  UserCommandHandlers
> {
  constructor(body: SleetUserCommandBody, handlers: UserCommandHandlers) {
    body.type = ApplicationCommandType.User
    super(body as RESTPostAPIContextMenuApplicationCommandsJSONBody, handlers)
  }

  override run(
    context: SleetContext,
    interaction: UserContextMenuCommandInteraction,
  ): Awaitable<unknown> {
    const { targetUser, targetMember } = interaction
    return super.run(context, interaction, targetUser, targetMember)
  }
}
