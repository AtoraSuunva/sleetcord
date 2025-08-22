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
import type { APIApplicationCommandOptionChoice } from 'discord-api-types/v10'
import type { SleetClient } from '../SleetClient.js'
import type { SleetModule } from './base/SleetModule.js'

export type ApplicationInteraction =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction
  | UserContextMenuCommandInteraction

/**
 * Context provided to every sleet module as `this`
 */
export interface SleetContext {
  sleet: SleetClient
  client: Client
}

// biome-ignore lint/suspicious/noConfusingVoidType: Required so a function doesn't need to call `return`
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
export type SleetEvent = Exclude<
  keyof BaseSleetModuleEventHandlers,
  keyof ClientEvents
>

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
  'eventSkipped',
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
  | keyof RunnableEventHandlers<CommandInteraction>
  | keyof SlashEventHandlers
  | keyof SleetExtensions,
  keyof BaseSleetModuleEventHandlers
>

/**
 * An array of all "events" that aren't hooked directly into discord.js' or Sleet's event emitters,
 * and instead require some special processing
 */
export const SpecialEventsList: SpecialEvent[] = [
  'run',
  'autocomplete',
  'shouldSkipEvent',
]

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
export interface BaseSleetModuleEventHandlers
  extends Partial<Omit<ClientEventHandlers, 'ready'>> {
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
  loadModule?: (
    this: SleetContext,
    module: SleetModule,
    qualifiedName: string,
  ) => ListenerResult
  /**
   * Event emitted when a SleetClient unloads any module
   * @param module The module that was unloaded
   * @param qualifiedName The qualified name of the module, for child modules it's `parent/child` (nesting deeper if necessary)
   */
  unloadModule?: (
    this: SleetContext,
    module: SleetModule,
    qualifiedName: string,
  ) => ListenerResult
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
   * Event emitted when an event that a module would've handled was skipped since
   * `shouldHandleEvent` returned `false` on some other module
   * @param eventDetails The event that was handled
   * @param skippedModule The module that would've handled the interaction
   * @param skippedBy The module that caused the skipping
   * @param reason The reason the event was skipped
   */
  eventSkipped?: (
    this: SleetContext,
    eventDetails: EventDetails,
    skippedModule: SleetModule,
    skippedBy: SleetModule,
    reason: SkipReason,
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
  sleetError?: (
    this: SleetContext,
    message: string,
    error: Error,
  ) => ListenerResult
  /**
   * Event emitted when Sleet encounters a warning, something that isn't fatal,
   * but might be indicative of a bug or misconfiguration
   * @param message The warning message
   * @param data Any data associated with the warning
   */
  sleetWarn?: (
    this: SleetContext,
    message: string,
    data?: unknown,
  ) => ListenerResult
  /**
   * Debug message from Sleet, usually just logging what it's doing
   * @param message The debug message
   * @param data Any data associated with the message
   */
  sleetDebug?: (
    this: SleetContext,
    message: string,
    data?: unknown,
  ) => ListenerResult
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
 * The reason a module was skipped
 */
export interface SkipReason {
  /**
   * The reason the module was skipped (shown to the user)
   */
  message: string
  /**
   * If the message should be ephemeral (for interactions)
   * @default false
   */
  ephemeral?: boolean
}

/**
 * Extensions to the SleetModule interface
 *
 * Used for events that aren't _really_ events, as their return values are actually used and affect control flow
 */
export interface SleetExtensions {
  /**
   * Decides if a module should handle an event or not. If this returns `false`,
   * the module is skipped for that event. Can be used to disable modules for certain guilds,
   * certain users, or bot-wide ratelimiting.
   * @param eventDetails The details of the event that will be handled
   * @param module The module that will be run
   */
  shouldSkipEvent?: (
    this: SleetContext,
    eventDetails: EventDetails,
    module: SleetModule,
  ) => Awaitable<SkipReason | false>
}

export type ShouldSkipEventReturn = Awaited<
  ReturnType<NonNullable<SleetExtensions['shouldSkipEvent']>>
>

export type SleetModuleEventHandlers = BaseSleetModuleEventHandlers &
  SleetExtensions

/**
 * Event handlers for Sleet events, Discord.js Events, and runnable modules
 */
export interface RunnableEventHandlers<
  I extends CommandInteraction,
  A extends unknown[] = [],
> extends BaseSleetModuleEventHandlers {
  run: (this: SleetContext, interaction: I, ...args: A) => Awaitable<unknown>
}

/**
 * Event handler for Sleet events, Discord.js Events, runnable modules, and
 * slash commands (autocomplete!)
 */
export interface SlashEventHandlers
  extends RunnableEventHandlers<ChatInputCommandInteraction> {
  autocomplete?:
    | ((
        this: SleetContext,
        interaction: AutocompleteInteraction,
        name: string,
        value: string | number,
      ) => Awaitable<APIApplicationCommandOptionChoice[]>)
    | undefined
}

export type NoRunSlashEventHandlers = Partial<SlashEventHandlers>
