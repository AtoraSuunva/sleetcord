import { CommandInteraction } from 'discord.js'
import { RunnableEventHandlers } from '../events'

export type SlashCommandHandlers = RunnableEventHandlers<CommandInteraction>
export type SlashCommandPartialHandlers = Partial<SlashCommandHandlers>
