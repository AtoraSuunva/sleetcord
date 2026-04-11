import type { Awaitable, CommandInteraction } from 'discord.js'

import type { RunnableEventHandlers, SleetContext } from '../events.ts'
import { SleetModule, SleetModuleBody } from './SleetModule.ts'

/**
 * A "runnable" sleet module, which can process any incoming interaction.
 *
 * This class differs from SleetCommand in that the body is generic.
 *
 * You shouldn't need to directly use this, you're likely looking for {@link SleetSlashCommand}, {@link SleetUserCommand}, or {@link SleetMessageCommand}.
 *
 * If you're looking to write a module that adds event handlers but doesn't require any interaction, use {@link SleetModule}.
 */
export class SleetRunnable<
  B extends SleetModuleBody = SleetModuleBody,
  I extends CommandInteraction = CommandInteraction,
  A extends unknown[] = [],
  Handlers extends RunnableEventHandlers<I, A> = RunnableEventHandlers<I, A>,
> extends SleetModule<B, Handlers> {
  public run(context: SleetContext, interaction: I, ...args: A): Awaitable<unknown> {
    return this.handlers.run.call(context, interaction, ...args)
  }
}
