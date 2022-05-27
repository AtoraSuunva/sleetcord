import { APIApplicationCommandOptionChoice } from 'discord-api-types/v10'
import {
  AutocompleteInteraction,
  Awaitable,
  Client,
  ClientEvents,
  CommandInteraction,
  Constants as DjsConstants,
  Interaction,
} from 'discord.js'
import { SleetClient } from '../SleetClient.js'
import { SleetModule } from './base/SleetModule.js'

export type SleetContext = {
  sleet: SleetClient
  client: Client
}

/** A type of every possible Discord event key */
export type DiscordEvent = keyof ClientEvents

/**
 * An array of all possible Discord Event keys
 */
export const DiscordEventsList: DiscordEvent[] = Object.values(
  DjsConstants.Events,
)

/**
 * Checks if a string is a valid discord event
 * @param event The event to check
 * @returns If the key is a valid Discord event
 */
export function isDiscordEvent(event: string): event is DiscordEvent {
  return DiscordEventsList.includes(event as unknown as DiscordEvent)
}

/**
 * A mapping of 'event name' => Handler arguments for attaching listeners to Discord.js events
 */
export type ClientEventHandlers = {
  [Event in keyof ClientEvents]: (
    this: SleetContext,
    ...args: ClientEvents[Event]
  ) => Awaitable<void>
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
  load?: (this: SleetContext) => Awaitable<void>
  unload?: (this: SleetContext) => Awaitable<void>
  loadModule?: (this: SleetContext, module: SleetModule) => Awaitable<void>
  unloadModule?: (this: SleetContext, module: SleetModule) => Awaitable<void>
}

export type SpecialEvent = Exclude<
  keyof RunnableEventHandlers<Interaction> | keyof SlashEventHandlers,
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
  I extends Interaction,
  A extends unknown[] = [],
> extends SleetModuleEventHandlers {
  run: (this: SleetContext, interaction: I, ...args: A) => Awaitable<unknown>
}

/**
 * Event handler for Sleet events, Discord.js Events, runnable modules, and
 * slash commands (autocomplete!)
 */
export interface SlashEventHandlers
  extends RunnableEventHandlers<CommandInteraction, []> {
  autocomplete?: (
    this: SleetContext,
    interaction: AutocompleteInteraction,
    name: string,
    value: string | number,
  ) => Awaitable<APIApplicationCommandOptionChoice[]>
}

export type NoRunSlashEventHandlers = Partial<SlashEventHandlers>
