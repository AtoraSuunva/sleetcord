import {
  APIApplicationCommand,
  ApplicationCommandOptionType,
} from 'discord-api-types'
import { CommandInteraction, ContextMenuInteraction } from 'discord.js'
import { ApplicationCommandTypes } from '../../constants/ApplicationCommandTypes'
import { CommandOptions, CommandRunnable } from './BuilderTypes'

export interface CommandConstructorParams extends Partial<CommandOptions> {
  name: string
  description: string
}

export interface TypedCommandConstructorParams
  extends CommandConstructorParams {
  type: ApplicationCommandTypes | ApplicationCommandOptionType.Subcommand
}

type CommandData = Partial<APIApplicationCommand> & {
  name: APIApplicationCommand['name']
  description: APIApplicationCommand['description']
  type: ApplicationCommandTypes | ApplicationCommandOptionType.Subcommand
  options: NonNullable<APIApplicationCommand['options']>
}

type SleetInteraction = CommandInteraction | ContextMenuInteraction

export class Command<
  Int extends SleetInteraction = SleetInteraction,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Params = any,
> {
  protected runHandlers: CommandRunnable<Int, Params>[] = []
  devGuildOnly: boolean
  data: CommandData

  constructor({
    name,
    description,
    type,
    ...rest
  }: TypedCommandConstructorParams) {
    const { devGuildOnly = false } = rest
    this.devGuildOnly = devGuildOnly
    this.data = {
      name,
      description,
      type,
      options: [],
    }
  }

  protected run(interaction: Int, params: Params): void {
    this.runHandlers.forEach((r) => r(interaction, params))
  }

  handleInteractionCreate(interaction: Int): void {
    this.run(interaction, {} as unknown as Params)
  }

  onInteractionCreate(run: CommandRunnable<Int, Params>): this {
    this.runHandlers.push(run)
    return this
  }
}
