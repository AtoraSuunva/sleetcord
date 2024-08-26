import type { SleetModuleEventHandlers } from '../events.js'

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
  /**
   * The name used to key & map this module, should be unique at each "level"
   *
   * ie. Registering two `logging` modules will cause the second to overwrite the first,
   * but if you have a `archive` module with a child `logging` module, and an `automod` module
   * with a child `logging` module they will NOT overwrite each other and will both be loaded
   *
   * The same applies for subcommands, `/archive logging` and `/automod logging` will both be loaded
   * and registered just fine
   */
  public name: string
  /** Handlers that are called when events happen, either Discord.js events or Sleet events */
  public handlers: Handlers
  /**
   * "Child" modules that are loaded along with this one, allows you to "scope" modules that may
   * share the same name. Mostly used to store subcommands for slash commands so their events are
   * registered correctly
   */
  public modules: SleetModule[]

  /**
   * Create a new SleetModule that a SleetClient can load and handle events for
   * @param options The options for this module
   * @param handlers Event handlers for Sleet to register
   */
  constructor(
    options: SleetModuleOptions,
    handlers: Handlers,
    modules: SleetModule[] = [],
  ) {
    this.name = options.name
    this.handlers = handlers
    this.modules = modules
  }
}
