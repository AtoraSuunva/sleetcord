import { APIApplicationCommandOptionChoice } from 'discord-api-types/v10'
import {
  AutocompleteInteraction,
  Awaitable,
  ChatInputCommandInteraction,
  Client,
  ClientEvents,
  CommandInteraction,
  Events,
  MessageContextMenuCommandInteraction,
  UserContextMenuCommandInteraction,
} from 'discord.js'
import { SleetClient } from '../SleetClient.js'
import { SleetModule } from './base/SleetModule.js'

export type ApplicationInteraction =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction
  | UserContextMenuCommandInteraction

export interface SleetContext {
  sleet: SleetClient
  client: Client
}

/** A type of every possible Discord event key */
type DiscordEvent = keyof ClientEvents

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

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type ListenerResult = Promise<unknown> | void

/**
 * A mapping of 'event name' => Handler arguments for attaching listeners to Discord.js events
 */
export type ClientEventHandlers = {
  [Event in keyof ClientEvents]: (
    this: SleetContext,
    ...args: ClientEvents[Event]
  ) => ListenerResult
}

/** A type of every possible sleet event key */
export type SleetEvent = Exclude<
  keyof SleetModuleEventHandlers,
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
 * All possible event handlers a command can have, both for Sleet events and Discord.js events
 */
export interface SleetModuleEventHandlers extends Partial<ClientEventHandlers> {
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
   * Event emitted when a module handles an interaction
   * @param module The module that was run
   * @param interaction The interaction that was handled
   */
  runModule?: (
    this: SleetContext,
    module: SleetModule,
    interaction: ApplicationInteraction,
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
}

export type SpecialEvent = Exclude<
  keyof RunnableEventHandlers<CommandInteraction> | keyof SlashEventHandlers,
  keyof SleetModuleEventHandlers
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
 * Event handlers for Sleet events, Discord.js Events, and runnable modules
 */
export interface RunnableEventHandlers<
  I extends CommandInteraction,
  A extends unknown[] = [],
> extends SleetModuleEventHandlers {
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
