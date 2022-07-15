import { SleetModuleEventHandlers } from '../events.js'

export interface SleetModuleOptions {
  /** The name of this module. used for logging and debugging */
  name: string
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
  public name: string

  /**
   * Create a new SleetModule that a SleetClient can load and handle events for
   * @param options The options for this module
   * @param handlers Event handlers for Sleet to register
   */
  constructor(public options: SleetModuleOptions, public handlers: Handlers) {
    this.name = options.name
  }
}
