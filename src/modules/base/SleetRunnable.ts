import { Awaitable, Interaction } from 'discord.js'
import { RunnableEventHandlers, SleetContext } from '../events.js'
import { SleetModule } from './SleetModule.js'

export type NamedBody = {
  name: string
}

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
  B extends NamedBody,
  I extends Interaction = Interaction,
  A extends unknown[] = [],
  Handlers extends RunnableEventHandlers<I, A> = RunnableEventHandlers<I, A>,
> extends SleetModule<Handlers> {
  constructor(public body: B, handlers: Handlers) {
    super(body.name, handlers)
  }

  public run(
    context: SleetContext,
    interaction: I,
    ...args: A
  ): Awaitable<unknown> {
    return this.handlers.run.call(context, interaction, ...args)
  }
}
