import { SleetModuleMiddleware } from '../../SleetClient.ts'
import type { SleetModuleEventHandlers } from '../events.ts'

export interface SleetModuleBody {
  /** The name of this module. used for logging and debugging */
  name: string
}

export interface SleetModuleOptions {
  /** Child modules to load along with this one, allows you to "scope" modules that may share the same name. Mostly used to store subcommands for slash commands so their events are registered correctly */
  modules?: SleetModule[]
  /** Middleware functions to register with the SleetClient. Note this will run for ALL modules, and just serves as a convenience method to register middleware without needing to get a handle to SleetClient (i.e. from `ready`) */
  middleware?: SleetModuleMiddleware[]
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
 * const mod = new SleetModule({
 *   name: 'logging'
 *  }, {
 *   load: () => {
 *     console.log('This module was loaded by a SleetClient!')
 *   },
 *   warn: (message: string) => {
 *     console.warn('Warning from Discord.js!', message)
 *   },
 *  }, {
 *   modules: [modModule],
 *   middleware: [modMiddleware],
 * })
 */
export class SleetModule<
  B extends SleetModuleBody = SleetModuleBody,
  Handlers extends SleetModuleEventHandlers = SleetModuleEventHandlers,
> {
  /**
   * The body that will be sent to Discord when registering this module
   */
  public body: B
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
   * Middleware functions to register with the SleetClient. Note this will run for ALL modules, and just serves as a convenience method to register middleware without needing to get a handle to SleetClient (i.e. from `ready`)
   */
  public middleware: SleetModuleMiddleware[]

  /**
   * Create a new SleetModule that a SleetClient can load and handle events for
   * @param body The body for this module
   * @param handlers Event handlers for Sleet to register
   * @param options Options for this module
   */
  constructor(body: B, handlers: Handlers, options: SleetModuleOptions = {}) {
    this.body = body
    this.name = body.name
    this.handlers = handlers
    this.modules = options.modules ?? []
    this.middleware = options.middleware ?? []
  }
}
