import { APIApplicationCommand } from 'discord-api-types'
import { GuildMember, User } from 'discord.js'
import { ApplicationCommandTypes } from '../constants/ApplicationCommandTypes'

export interface InteractionCommandExtras {
  name: string
  devGuildOnly?: boolean
}

export interface SlashInteractionCommand extends InteractionCommandExtras {
  description: string
  type: ApplicationCommandTypes.CHAT_INPUT
  // run: (interaction: CommandInteraction) => unknown
}

export interface UserInteractionTarget {
  /** The user targetted by the interaction */
  user: User
  /** The member targetted by the interaction, if in a guild */
  member: GuildMember | null
}

export interface UserInteractionCommand extends InteractionCommandExtras {
  type: ApplicationCommandTypes.USER
  // run: (
  //   interaction: ContextMenuInteraction,
  //   target: UserInteractionTarget,
  // ) => unknown
}

export interface MessageInteractionCommand extends InteractionCommandExtras {
  type: ApplicationCommandTypes.MESSAGE
  // run: (interaction: ContextMenuInteraction, message: Message) => unknown
}

export type AppInteraction =
  | SlashInteractionCommand
  | UserInteractionCommand
  | MessageInteractionCommand

export type InteractionCommand = Partial<APIApplicationCommand> & AppInteraction
