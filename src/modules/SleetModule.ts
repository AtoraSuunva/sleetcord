import { Awaitable, ClientEvents } from 'discord.js'

/**
 * A mapping of 'event name' => Handler arguments for attaching listeners to Discord.js events
 */
export type ClientEventHandlers = {
  [Event in keyof ClientEvents]: (
    ...args: ClientEvents[Event]
  ) => Awaitable<void>
}

/**
 * All possible event handlers a command can have, both for Sleet events and Discord.js events
 */
export interface SleetModuleEventHandlers extends Partial<ClientEventHandlers> {
  /**
   * Event emitted when a SleetClient loads this module, can be used to fetch data
   * from an external source
   */
  load?: () => Awaitable<void>
}

/**
 * A module usable by the Sleet client.
 *
 * Sleet modules contain events handlers (both for Sleet and Discord.js events)
 * and the necessary logic/data for Sleet to route events properly.
 *
 * This class is the backbone of most event handling in Sleet, and is used by SleetCommands
 *
 * If you want to write some functionality that doesn't require an interaction,
 * like logging ready/init/warn/apiRequest/apiResponse/etc you can use this directly
 *
 * @example
 * const mod = new SleetModule('logging', {
 *  load: () => {
 *    console.log('This module was loaded by a SleetClient!')
 *  },
 *  warn: (message: string) => {
 *    console.warn('Warning from Discord.js!', message)
 *  },
 * })
 */
export class SleetModule<
  Handlers extends SleetModuleEventHandlers = SleetModuleEventHandlers,
> {
  /**
   * Create a new SleetModule that a SleetClient can load and handle events for
   * @param name The name of this module, used for logging and debugging
   * @param handlers Event handlers for Sleet to register
   */
  constructor(public name: string, public handlers: Handlers) {}
}
