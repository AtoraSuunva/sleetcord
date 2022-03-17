import {
  ApplicationCommandType,
  RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord-api-types/v9'
import {
  Awaitable,
  CommandInteractionOption,
  User,
  UserContextMenuInteraction,
} from 'discord.js'
import { CommandEventHandlers, SleetCommand } from './SleetCommand.js'

type UserApplicationCommandJSONBody =
  RESTPostAPIContextMenuApplicationCommandsJSONBody & {
    type?: ApplicationCommandType.User
  }

type InteractionMember = NonNullable<CommandInteractionOption['member']> | null

export interface UserCommandHandlers
  extends CommandEventHandlers<
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

  override run(interaction: UserContextMenuInteraction): Awaitable<unknown> {
    const { targetUser, targetMember } = interaction
    return super.run(interaction, targetUser, targetMember)
  }
}
