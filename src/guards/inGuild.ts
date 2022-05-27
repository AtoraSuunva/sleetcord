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

export function inGuild(
  interaction: ButtonInteraction,
): asserts interaction is ButtonInteraction<'cached'>
export function inGuild(
  interaction: SelectMenuInteraction,
): asserts interaction is SelectMenuInteraction<'cached'>
export function inGuild(
  interaction: MessageComponentInteraction,
): asserts interaction is MessageComponentInteraction<'cached'>

export function inGuild(
  interaction: MessageContextMenuInteraction,
): asserts interaction is MessageContextMenuInteraction<'cached'>
export function inGuild(
  interaction: UserContextMenuInteraction,
): asserts interaction is UserContextMenuInteraction<'cached'>
export function inGuild(
  interaction: ContextMenuInteraction,
): asserts interaction is ContextMenuInteraction<'cached'>

export function inGuild(
  interaction: CommandInteraction,
): asserts interaction is CommandInteraction<'cached'>
export function inGuild(
  interaction: BaseCommandInteraction,
): asserts interaction is BaseCommandInteraction<'cached'>

export function inGuild(
  interaction: AutocompleteInteraction,
): asserts interaction is AutocompleteInteraction<'cached'>

export function inGuild(
  interaction: Interaction,
): asserts interaction is Interaction<'cached'> {
  if (!interaction.inGuild()) {
    throw new PreRunError('This command must be run in a guild.')
  }
}
