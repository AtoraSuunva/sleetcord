import {
  AutocompleteInteraction,
  BaseCommandInteraction,
  ButtonInteraction,
  CommandInteraction,
  ContextMenuInteraction,
  Interaction,
  MessageComponentInteraction,
  MessageContextMenuInteraction,
  SelectMenuInteraction,
  UserContextMenuInteraction,
} from 'discord.js'
import { PreRunError } from '../errors/PreRunError.js'

type CacheType = 'cached' | 'raw'

export function inGuild(
  interaction: ButtonInteraction,
): asserts interaction is ButtonInteraction<CacheType>
export function inGuild(
  interaction: SelectMenuInteraction,
): asserts interaction is SelectMenuInteraction<CacheType>
export function inGuild(
  interaction: MessageComponentInteraction,
): asserts interaction is MessageComponentInteraction<CacheType>

export function inGuild(
  interaction: MessageContextMenuInteraction,
): asserts interaction is MessageContextMenuInteraction<CacheType>
export function inGuild(
  interaction: UserContextMenuInteraction,
): asserts interaction is UserContextMenuInteraction<CacheType>
export function inGuild(
  interaction: ContextMenuInteraction,
): asserts interaction is ContextMenuInteraction<CacheType>

export function inGuild(
  interaction: CommandInteraction,
): asserts interaction is CommandInteraction<CacheType>
export function inGuild(
  interaction: BaseCommandInteraction,
): asserts interaction is BaseCommandInteraction<CacheType>

export function inGuild(
  interaction: AutocompleteInteraction,
): asserts interaction is AutocompleteInteraction<CacheType>

export function inGuild(
  interaction: Interaction,
): asserts interaction is Interaction<CacheType> {
  if (!interaction.inGuild()) {
    throw new PreRunError('This command must be run in a guild.')
  }
}
