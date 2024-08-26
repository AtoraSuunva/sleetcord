import type {
  AutocompleteInteraction,
  BaseInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  CommandInteraction,
  ContextMenuCommandInteraction,
  MessageComponentInteraction,
  MessageContextMenuCommandInteraction,
  SelectMenuInteraction,
  UserContextMenuCommandInteraction,
} from 'discord.js'
import { PreRunError } from '../errors/PreRunError.js'

type InGuildCacheType = 'cached' | 'raw'

/**
 * Checks that an interaction is being run inside a guild, also performing type assertion on the interaction
 * @param interaction The interaction to check
 * @throws {PreRunError} If the interaction isn't being run inside a guild
 */
export function inGuildGuard(
  interaction: ButtonInteraction,
): asserts interaction is ButtonInteraction<InGuildCacheType>
export function inGuildGuard(
  interaction: SelectMenuInteraction,
): asserts interaction is SelectMenuInteraction<InGuildCacheType>
export function inGuildGuard(
  interaction: MessageComponentInteraction,
): asserts interaction is MessageComponentInteraction<InGuildCacheType>

export function inGuildGuard(
  interaction: MessageContextMenuCommandInteraction,
): asserts interaction is MessageContextMenuCommandInteraction<InGuildCacheType>
export function inGuildGuard(
  interaction: UserContextMenuCommandInteraction,
): asserts interaction is UserContextMenuCommandInteraction<InGuildCacheType>
export function inGuildGuard(
  interaction: ContextMenuCommandInteraction,
): asserts interaction is ContextMenuCommandInteraction<InGuildCacheType>

export function inGuildGuard(
  interaction: ChatInputCommandInteraction,
): asserts interaction is ChatInputCommandInteraction<InGuildCacheType>

export function inGuildGuard(
  interaction: CommandInteraction,
): asserts interaction is CommandInteraction<InGuildCacheType>

export function inGuildGuard(
  interaction: AutocompleteInteraction,
): asserts interaction is AutocompleteInteraction<InGuildCacheType>

export function inGuildGuard(
  interaction: BaseInteraction,
): asserts interaction is BaseInteraction<InGuildCacheType> {
  if (!interaction.inGuild()) {
    throw new PreRunError('This command must be run in a guild.')
  }
}
