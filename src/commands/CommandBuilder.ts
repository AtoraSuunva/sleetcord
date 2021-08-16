import {
  APIApplicationCommandSubCommandOptions,
  ApplicationCommandOptionType,
} from 'discord-api-types/v9'
import { CommandInteraction, ContextMenuInteraction, Message } from 'discord.js'
import { ApplicationCommandTypes } from '../constants/ApplicationCommandTypes'
import { InteractionCommand } from './CommandTypes'

interface CommandOptions {
  devGuildOnly: boolean
}

type CommandRunnable<T> = (interaction: T) => void

export class Command<Int> {
  runHandlers: CommandRunnable<Int>[] = []
  devGuildOnly: boolean
  data: InteractionCommand & {
    options: NonNullable<InteractionCommand['options']>
  }

  constructor(
    name: string,
    description: string,
    type: ApplicationCommandTypes,
    options: Partial<CommandOptions> = {},
  ) {
    const { devGuildOnly = false } = options
    this.devGuildOnly = devGuildOnly
    this.data = {
      name,
      description,
      type,
      options: [],
    }
  }

  run(interaction: Int): void {
    this.runHandlers.forEach((r) => r(interaction))
  }

  onInteractionCreate(run: CommandRunnable<Int>): this {
    this.runHandlers.push(run)
    return this
  }
}

export class Subcommand {
  runHandlers: CommandRunnable<CommandInteraction>[] = []
  data: APIApplicationCommandSubCommandOptions & {
    options: NonNullable<APIApplicationCommandSubCommandOptions['options']>
  }

  constructor(name: string, description: string) {
    this.data = {
      name,
      description,
      type: ApplicationCommandOptionType.Subcommand,
      options: [],
    }
  }

  run(interaction: CommandInteraction): void {
    this.runHandlers.forEach((r) => r(interaction))
  }

  onInteractionCreate(run: CommandRunnable<CommandInteraction>): this {
    this.runHandlers.push(run)
    return this
  }

  addOption(
    name: string,
    description: string,
    type: ApplicationCommandOptionType,
    required = false,
  ): this {
    this.data.options.push({
      name,
      description,
      type,
      required,
    })
    return this
  }
}

export class SlashCommand extends Command<CommandInteraction> {
  subcommands = new Map<string, Subcommand>()

  constructor(
    name: string,
    description: string,
    options: Partial<CommandOptions> = {},
  ) {
    super(name, description, ApplicationCommandTypes.CHAT_INPUT, options)
  }

  override run(interaction: CommandInteraction): void {
    const subcommand = interaction.options.getSubcommand()

    if (subcommand) {
      const sub = this.subcommands.get(subcommand)
      if (!sub) {
        throw new Error(`Unknown subcommand ${sub} for ${this.data.name}`)
      }

      sub.run(interaction)
    }

    super.run(interaction)
  }

  addOption(
    name: string,
    description: string,
    type: ApplicationCommandOptionType,
    required = false,
  ): this {
    if (this.subcommands.size > 0) {
      throw new Error(
        `${this.data.name} already has subcommands, you cannot add options`,
      )
    }

    this.data.options.push({
      name,
      description,
      type,
      required,
    })

    return this
  }

  addSubcommand(subcommand: Subcommand): this {
    const hasNonSubcommands = this.data.options.some(
      (o) => o.type !== ApplicationCommandOptionType.Subcommand,
    )

    if (hasNonSubcommands) {
      throw new Error(
        `${this.data.name} already has non-subcommands, you cannot add subcommands`,
      )
    }

    if (this.subcommands.has(subcommand.data.name)) {
      throw new Error(
        `${this.data.name} already has a subcommand named ${subcommand.data.name}`,
      )
    }

    this.data.options.push(subcommand.data)
    this.subcommands.set(subcommand.data.name, subcommand)
    return this
  }
}

export class UserCommand extends Command<ContextMenuInteraction> {}

export class MessageCommand extends Command<ContextMenuInteraction> {
  override run(interaction: ContextMenuInteraction, message: Message): void {
    this.runHandlers.forEach((r) => r(interaction))
  }
}
