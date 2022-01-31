import { ApplicationCommandOptionType } from 'discord-api-types/payloads/v9'
import { BaseSlashCommand } from './BaseSlashCommand'

interface SubcommandConstructorParams {
  name: string
  description: string
}

export class Subcommand<Params> extends BaseSlashCommand<Params> {
  constructor(params: SubcommandConstructorParams) {
    super({
      type: ApplicationCommandOptionType.Subcommand,
      ...params,
    })
  }
}
