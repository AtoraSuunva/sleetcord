import { SleetModuleMiddleware } from '../../SleetClient.ts'
import type { SleetModuleEventHandlers } from '../events.ts'

/**
 * The body of a SleetModule, which contains the necessary information for Sleet to register and handle the module.
 *
 * This is unique in that while most modules have a body that is sent to Discord to register the module (e.g. slash commands, context menu commands), SleetModule's body is just used for internal organization, though it's set to conveniently match the shape of Discord's API request bodies
 */
export interface SleetModuleBody {
  /** The name of this module. used for logging and debugging */
  name: string
}

/**
 * Options for a SleetModule, which can contain child modules to load along with this one and middleware functions to register with the SleetClient. Note that middleware functions will run for ALL modules, so they should be used for functionality that needs to run across all modules, like logging or error handling.
 *
 * Your middleware functions will need to implement their own filtering logic if you want them to conditionally run, as to allow modules to easily implement logging or error handling modules without needing to get a handle to the SleetClient (i.e. from `ready`) just to register middleware
 *
 * If you only want to run a function to filter `run` handlers, you can implement the logic directly in the `run` handler of your module since commands/subcommand groups will run their own `run` handlers before their children and can throw to abort early
 */
export interface SleetModuleOptions {
  /** Child modules to load along with this one, allows you to "scope" modules that may share the same name. Mostly used to store subcommands for slash commands so their events are registered correctly */
  modules?: SleetModule[]
  /**
   * Middleware functions to register with the SleetClient.
   *
   * Note this will run for ALL modules, and just serves as a convenience method to register middleware without needing to get a handle to SleetClient (i.e. from `ready`).
   * Use `run` handlers if you only wish to run logic/filter `run` handlers since they will be filtered to only run for subcommands
   */
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
