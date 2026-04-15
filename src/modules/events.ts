import type { APIApplicationCommandOptionChoice } from 'discord-api-types/v10'
import {
  type AutocompleteInteraction,
  type Awaitable,
  type ChatInputCommandInteraction,
  type Client,
  type ClientEvents,
  type CommandInteraction,
  Events,
  type GatewayDispatchPayload,
  type MessageContextMenuCommandInteraction,
  type UserContextMenuCommandInteraction,
} from 'discord.js'

import type { SleetClient } from '../SleetClient.ts'
import type { SleetModule } from './base/SleetModule.ts'

/**
 * A union type of all possible application interactions Sleet can handle
 */
export type ApplicationInteraction =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction
  | UserContextMenuCommandInteraction

/**
 * Context provided to every sleet module as `this`
 */
export interface SleetContext {
  /** The Sleet client instance */
  sleet: SleetClient
  /** The Discord.js client instance */
  client: Client
}

/** The result of a listener function, which can be a promise or void */
export type ListenerResult<T = unknown> = Promise<T> | void

/** A type of every possible Discord event key */
export type DiscordEvent = keyof ClientEvents

/**
 * An array of all possible Discord Event keys
 * *Technically* incorrect since 'voiceServerUpdate' and 'voiceStateUpdate' are included, but require @discord.js/voice
 * but screw it, it works
 */
const DiscordEventsList = Object.values(Events)

/**
 * Checks if a string is a valid discord event
 * @param event The event to check
 * @returns If the key is a valid Discord event
 */
export function isDiscordEvent(event: string): event is DiscordEvent {
  return DiscordEventsList.includes(event as unknown as Events)
}

/** A type of every possible sleet event key */
export type SleetEvent = Exclude<keyof BaseSleetModuleEventHandlers, keyof ClientEvents>

/**
 * An array of all possible Sleet Event keys
 */
export const SleetEventsList: SleetEvent[] = [
  'load',
  'unload',
  'loadModule',
  'unloadModule',
  'runModule',
  'eventHandled',
  'autocompleteInteractionError',
  'applicationInteractionError',
  'sleetError',
  'sleetWarn',
  'sleetDebug',
]

/**
 * Checks if a string is a valid Sleet Event
 * @param event The key to checks
 * @returns If the key is a valid Sleet event
 */
export function isSleetEvent(event: string): event is SleetEvent {
  return SleetEventsList.includes(event as unknown as SleetEvent)
}

/**
 * Events that modules can handle, but aren't Discord.js or Sleet "global" events
 *
 * These are directed events only sent to a specific module (and possibly it's sub-modules),
 * or events that sleet treats more like callbacks and needs the return value
 */
export type SpecialEvent = Exclude<
  keyof RunnableEventHandlers<CommandInteraction> | keyof SlashEventHandlers,
  // | keyof SleetExtensions,
  keyof BaseSleetModuleEventHandlers
>

/**
 * An array of all "events" that aren't hooked directly into discord.js' or Sleet's event emitters,
 * and instead require some special processing
 */
export const SpecialEventsList: SpecialEvent[] = ['run', 'autocomplete']

/**
 * Checks if a string is a valid Special Event
 * @param event The key to checks
 * @returns If the key is a valid Special event
 */
export function isSpecialEvent(event: string): event is SpecialEvent {
  return SpecialEventsList.includes(event as unknown as SpecialEvent)
}

/**
 * A mapping of 'event name' => Handler arguments for attaching listeners to Sleet events
 */
export type SleetModuleEventHandlerArgs = Required<{
  [Event in keyof BaseSleetModuleEventHandlers]: Parameters<
    NonNullable<BaseSleetModuleEventHandlers[Event]>
  >
}>

/**
 * A type of every possible event name + arguments pairing
 */
export type EventDetails = NonNullable<
  {
    [Event in keyof BaseSleetModuleEventHandlers]: {
      name: Event
      arguments: SleetModuleEventHandlerArgs[Event]
    }
  }[keyof BaseSleetModuleEventHandlers]
>

/**
 * A union of all possible event arguments for Sleet events
 */
export type EventArguments = EventDetails['arguments']

/**
 * A mapping of 'event name' => Handler arguments for attaching listeners to Discord.js events
 */
export type ClientEventHandlers = {
  [Event in keyof ClientEvents]: (
    this: SleetContext,
    ...args: ClientEvents[Event]
  ) => ListenerResult
}

/**
 * All possible event handlers a command can have, both for Sleet events and Discord.js events
 */
export interface BaseSleetModuleEventHandlers extends Partial<Omit<ClientEventHandlers, 'ready'>> {
  /**
   * Event emitted when a SleetClient loads this module, can be used to fetch data
   * from an external source
   */
  load?: (this: SleetContext) => ListenerResult
  /**
   * Event emitted when a SleetClient unloads this module, can be used to clean up
   */
  unload?: (this: SleetContext) => ListenerResult
  /**
   * Event emitted when a SleetClient loads any new module
   * @param module The module that was loaded
   * @param qualifiedName The qualified name of the module, for child modules it's `parent/child` (nesting deeper if necessary)
   */
  loadModule?: (this: SleetContext, module: SleetModule, qualifiedName: string) => ListenerResult
  /**
   * Event emitted when a SleetClient unloads any module
   * @param module The module that was unloaded
   * @param qualifiedName The qualified name of the module, for child modules it's `parent/child` (nesting deeper if necessary)
   */
  unloadModule?: (this: SleetContext, module: SleetModule, qualifiedName: string) => ListenerResult
  /**
   * Event emitted when a module runs (via the run handler)
   * @param module The module that was run
   * @param interaction The interaction that was handled
   */
  runModule?: (
    this: SleetContext,
    module: SleetModule,
    interaction: ApplicationInteraction,
  ) => ListenerResult
  /**
   * Event emitted when a module handles an event
   * @param eventDetails The event that was handled
   * @param module The module that handled the interaction
   */
  eventHandled?: (
    this: SleetContext,
    eventDetails: EventDetails,
    module: SleetModule,
  ) => ListenerResult
  /**
   * Event emitted when an autocomplete interaction errors out
   * @param module The module that was run
   * @param interaction The interaction that was handled
   * @param error The error that was thrown
   */
  autocompleteInteractionError?: (
    this: SleetContext,
    module: SleetModule,
    interaction: AutocompleteInteraction,
    error: unknown,
  ) => ListenerResult
  /**
   * Event emitted when an application interaction errors out
   * @param module The module that was run
   * @param interaction The interaction that was handled
   * @param error The error that was thrown
   */
  applicationInteractionError?: (
    this: SleetContext,
    module: SleetModule,
    interaction: ApplicationInteraction,
    error: unknown,
  ) => ListenerResult
  /**
   * Event emitted when Sleet encounters an error, Sleet can usually recover,
   * but this means something bad has happened
   * @param message The error message
   * @param error The error Sleet encountered
   */
  sleetError?: (this: SleetContext, message: string, error: Error) => ListenerResult
  /**
   * Event emitted when Sleet encounters a warning, something that isn't fatal,
   * but might be indicative of a bug or misconfiguration
   * @param message The warning message
   * @param data Any data associated with the warning
   */
  sleetWarn?: (this: SleetContext, message: string, data?: unknown) => ListenerResult
  /**
   * Debug message from Sleet, usually just logging what it's doing
   * @param message The debug message
   * @param data Any data associated with the message
   */
  sleetDebug?: (this: SleetContext, message: string, data?: unknown) => ListenerResult
  /**
   * Raw gateway payloads, as directly received from Discord
   *
   * @see https://discord.com/developers/docs/topics/gateway-events#receive-events
   * @param data The raw data from the gateway
   * @param shardId The shardId handling this gateway event
   */
  raw?: (data: GatewayDispatchPayload, shardId: number) => ListenerResult
}

/**
 * Extensions to the SleetModule interface
 *
 * Used for events that aren't _really_ events, as their return values are actually used and affect control flow
 */
export interface SleetExtensions {}

/**
 * A map of all possible event handlers for Sleet events, Discord.js Events, and runnable modules
 */
export type SleetModuleEventHandlers = BaseSleetModuleEventHandlers & SleetExtensions

/**
 * Event handlers for Sleet events, Discord.js Events, and runnable modules
 */
export interface RunnableEventHandlers<
  I extends CommandInteraction,
  A extends unknown[] = [],
> extends BaseSleetModuleEventHandlers {
  /**
   * A generic run event handler for runnable modules, which are automatically routed and called by Sleet when the module is triggered (e.g. a slash command is invoked). Receives the interaction and any additional arguments as parameters, and can return a promise if it needs to perform asynchronous actions.
   * @param interaction The interaction that triggered the module
   * @param args Any additional arguments, such as the message that was right-clicked for a message context menu command
   * @returns A promise that resolves when the handler is done, or void if it doesn't need to perform any asynchronous actions
   */
  run: (this: SleetContext, interaction: I, ...args: A) => Awaitable<unknown>
}

/**
 * Event handler for Sleet events, Discord.js Events, runnable modules, and slash commands (autocomplete!)
 */
export interface SlashEventHandlers extends RunnableEventHandlers<ChatInputCommandInteraction> {
  /**
   * A generic autocomplete event handler for slash commands, which is automatically routed and called by Sleet when an autocomplete interaction is triggered for the command. Receives the interaction, the name of the focused option, and the current value of the focused option as parameters, and should return a promise that resolves to an array of choices to show in the autocomplete menu.
   */
  autocomplete?:
    | ((
        this: SleetContext,
        interaction: AutocompleteInteraction,
        name: string,
        value: string | number,
      ) => Awaitable<APIApplicationCommandOptionChoice[]>)
    | undefined
}

/**
 * Event handler for Modules without a run handler
 */
export type NoRunSlashEventHandlers = Partial<SlashEventHandlers>
