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
): asserts interaction is ButtonInteraction<'present'>
export function inGuild(
  interaction: SelectMenuInteraction,
): asserts interaction is SelectMenuInteraction<'present'>
export function inGuild(
  interaction: MessageComponentInteraction,
): asserts interaction is MessageComponentInteraction<'present'>

export function inGuild(
  interaction: MessageContextMenuInteraction,
): asserts interaction is MessageContextMenuInteraction<'present'>
export function inGuild(
  interaction: UserContextMenuInteraction,
): asserts interaction is UserContextMenuInteraction<'present'>
export function inGuild(
  interaction: ContextMenuInteraction,
): asserts interaction is ContextMenuInteraction<'present'>

export function inGuild(
  interaction: CommandInteraction,
): asserts interaction is CommandInteraction<'present'>
export function inGuild(
  interaction: BaseCommandInteraction,
): asserts interaction is BaseCommandInteraction<'present'>

export function inGuild(
  interaction: AutocompleteInteraction,
): asserts interaction is AutocompleteInteraction<'present'>

export function inGuild(
  interaction: Interaction,
): asserts interaction is Interaction<'present'> {
  if (!interaction.inGuild()) {
    throw new PreRunError('This command must be run in a guild.')
  }
}
