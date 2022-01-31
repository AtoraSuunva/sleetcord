import { ApplicationCommandOptionType } from 'discord-api-types/payloads/v9'
import { Channel, CommandInteraction, Role, User } from 'discord.js'
import { Command, TypedCommandConstructorParams } from './Command'

interface DefaultTypeMap {
  [ApplicationCommandOptionType.Subcommand]: null
  [ApplicationCommandOptionType.SubcommandGroup]: null
  [ApplicationCommandOptionType.String]: string
  [ApplicationCommandOptionType.Integer]: number
  [ApplicationCommandOptionType.Boolean]: boolean
  [ApplicationCommandOptionType.User]: User
  [ApplicationCommandOptionType.Channel]: Channel
  [ApplicationCommandOptionType.Role]: Role
  [ApplicationCommandOptionType.Mentionable]: User | Role
  [ApplicationCommandOptionType.Number]: number
}

interface SlashCommandOptionExtra<Type extends ApplicationCommandOptionType> {
  defaultValue?: DefaultTypeMap[Type]
}

export interface SlashCommandOption<Type extends ApplicationCommandOptionType>
  extends SlashCommandOptionExtra<Type> {
  name: string
  description: string
  type: Type
  required?: boolean
}

export type ApplicationCommandOptionTypeNotSubcommand = Exclude<
  ApplicationCommandOptionType,
  'Subcommand' | 'SubcommandGroup'
>

export function isSubcommand(
  type: ApplicationCommandOptionType,
): type is ApplicationCommandOptionTypeNotSubcommand {
  return [
    ApplicationCommandOptionType.Subcommand,
    ApplicationCommandOptionType.SubcommandGroup,
  ].includes(type)
}

export class BaseSlashCommand<Params> extends Command<
  CommandInteraction,
  Params
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  optionExtra = new Map<string, SlashCommandOptionExtra<any>>()

  constructor({ ...args }: TypedCommandConstructorParams) {
    super({
      ...args,
    })
  }

  override handleInteractionCreate(interaction: CommandInteraction): void {
    const params: Record<string, unknown> = {}

    for (const option of this.data.options) {
      if (isSubcommand(option.type)) continue

      let arg

      switch (option.type) {
        case ApplicationCommandOptionType.String:
          arg = interaction.options.getString(option.name, option.required)
          break
        case ApplicationCommandOptionType.Integer:
          arg = interaction.options.getInteger(option.name, option.required)
          break
        case ApplicationCommandOptionType.Boolean:
          arg = interaction.options.getBoolean(option.name, option.required)
          break
        case ApplicationCommandOptionType.User:
          arg = interaction.options.getUser(option.name, option.required)
          break
        case ApplicationCommandOptionType.Channel:
          arg = interaction.options.getChannel(option.name, option.required)
          break
        case ApplicationCommandOptionType.Role:
          arg = interaction.options.getRole(option.name, option.required)
          break
        case ApplicationCommandOptionType.Mentionable:
          arg = interaction.options.getMentionable(option.name, option.required)
          break
        case ApplicationCommandOptionType.Number:
          arg = interaction.options.getNumber(option.name, option.required)
          break
      }

      const defaultValue = this.optionExtra.get(option.name)?.defaultValue
      params[option.name] = arg ?? (defaultValue || null)
    }

    this.run(interaction, params as unknown as Params)
  }

  addOption<T extends ApplicationCommandOptionType>({
    name,
    description,
    type,
    required = false,
    defaultValue,
  }: SlashCommandOption<T>): this {
    this.data.options.push({
      name,
      description,
      type,
      required,
    })

    this.optionExtra.set(this.data.name, {
      defaultValue,
    })

    return this
  }
}
