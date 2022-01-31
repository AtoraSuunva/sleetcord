import { ApplicationCommandOptionType } from 'discord-api-types/payloads/v9'
import { CommandInteraction } from 'discord.js'
import { ApplicationCommandTypes } from '../../constants/ApplicationCommandTypes'
import {
  BaseSlashCommand,
  isSubcommand,
  SlashCommandOption,
} from './BaseSlashCommand'
import { TypedCommandConstructorParams } from './Command'
import { Subcommand } from './Subcommand'

export class SlashCommand<Params> extends BaseSlashCommand<Params> {
  subcommands = new Map<string, Subcommand<unknown>>()

  constructor(params: TypedCommandConstructorParams) {
    super({
      ...params,
      type: ApplicationCommandTypes.CHAT_INPUT,
    })
  }

  protected override run(
    interaction: CommandInteraction,
    params: Params,
  ): void {
    const subcommand = interaction.options.getSubcommand(false)

    if (subcommand) {
      const sub = this.subcommands.get(subcommand)
      if (!sub) {
        throw new Error(`Unknown subcommand ${sub} for ${this.data.name}`)
      }

      sub.run(interaction, params)
    }

    super.run(interaction, params)
  }

  override addOption<T extends ApplicationCommandOptionType>(
    opt: SlashCommandOption<T>,
  ): this {
    if (isSubcommand(opt.type)) {
      throw new Error(
        `To add a subcommand to ${this.data.name}, use .addSubcommand, not .addOption`,
      )
    }

    if (this.subcommands.size > 0) {
      throw new Error(
        `${this.data.name} already has subcommands, you cannot add options`,
      )
    }

    return super.addOption(opt)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addSubcommand(subcommand: Subcommand<any>): this {
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
