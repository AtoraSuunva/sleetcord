import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/rest/v9'
import { Interaction } from 'discord.js'
import { RunnableEventHandlers } from '../events.js'
import { SleetRunnable } from './SleetRunnable.js'

/**
 * A command usable by the Sleet client. This one handles any generic "command" that comes in,
 * from slash/application to user command to message command or any else that appear
 *
 * This class contains all common functionality and ensures proper and consistent typing between them all
 * for the Sleet client to correctly route incoming interactions
 *
 * You shouldn't need to directly use this, you're likely looking for {@link SleetSlashCommand}, {@link SleetUserCommand}, or {@link SleetMessageCommand}.
 *
 * If you're looking to write a module that adds event handlers but doesn't require any interaction, use {@link SleetModule}.
 */
export class SleetCommand<
  I extends Interaction = Interaction,
  A extends unknown[] = [],
  Handlers extends RunnableEventHandlers<I, A> = RunnableEventHandlers<I, A>,
> extends SleetRunnable<
  RESTPostAPIApplicationCommandsJSONBody,
  I,
  A,
  Handlers
> {
  constructor(
    public override body: RESTPostAPIApplicationCommandsJSONBody,
    handlers: Handlers,
  ) {
    super(body, handlers)
  }
}
