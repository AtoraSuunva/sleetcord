import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/rest/v9'
import { Awaitable, Interaction } from 'discord.js'
import { SleetModuleEventHandlers, SleetModule } from './SleetModule.js'
// import type { SleetSlashCommand } from './SleetSlashCommand.js'

/**
 * Event handlers for Sleet events, Discord.js Events, and incoming interactions
 */
export interface CommandEventHandlers<
  I extends Interaction,
  A extends unknown[] = [],
> extends SleetModuleEventHandlers {
  run: (interaction: I, ...args: A) => Awaitable<unknown>
}

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
  Handlers extends CommandEventHandlers<I, A> = CommandEventHandlers<I, A>,
> extends SleetModule<Handlers> {
  constructor(
    public body: RESTPostAPIApplicationCommandsJSONBody,
    handlers: Handlers,
  ) {
    super(body.name, handlers)
  }

  public run(interaction: I, ...args: A): Awaitable<unknown> {
    return this.handlers.run(interaction, ...args)
  }
}
