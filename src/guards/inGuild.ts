import {
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

export function inGuild(
  interaction: ButtonInteraction,
): asserts interaction is ButtonInteraction<InGuildCacheType>
export function inGuild(
  interaction: SelectMenuInteraction,
): asserts interaction is SelectMenuInteraction<InGuildCacheType>
export function inGuild(
  interaction: MessageComponentInteraction,
): asserts interaction is MessageComponentInteraction<InGuildCacheType>

export function inGuild(
  interaction: MessageContextMenuCommandInteraction,
): asserts interaction is MessageContextMenuCommandInteraction<InGuildCacheType>
export function inGuild(
  interaction: UserContextMenuCommandInteraction,
): asserts interaction is UserContextMenuCommandInteraction<InGuildCacheType>
export function inGuild(
  interaction: ContextMenuCommandInteraction,
): asserts interaction is ContextMenuCommandInteraction<InGuildCacheType>

export function inGuild(
  interaction: ChatInputCommandInteraction,
): asserts interaction is ChatInputCommandInteraction<InGuildCacheType>

export function inGuild(
  interaction: CommandInteraction,
): asserts interaction is CommandInteraction<InGuildCacheType>

export function inGuild(
  interaction: AutocompleteInteraction,
): asserts interaction is AutocompleteInteraction<InGuildCacheType>

export function inGuild(
  interaction: BaseInteraction,
): asserts interaction is BaseInteraction<InGuildCacheType> {
  if (!interaction.inGuild()) {
    throw new PreRunError('This command must be run in a guild.')
  }
}
