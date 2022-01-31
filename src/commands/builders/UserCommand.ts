import { APIInteractionDataResolvedGuildMember } from 'discord-api-types/payloads/v9'
import {
  Client,
  ContextMenuInteraction,
  Guild,
  GuildMember,
  User,
} from 'discord.js'
import { ApplicationCommandTypes } from '../../constants/ApplicationCommandTypes'
import { Command, CommandConstructorParams } from './Command'

function makeMember(
  client: Client<boolean>,
  member: GuildMember | APIInteractionDataResolvedGuildMember,
  guild: Guild,
): GuildMember {
  return member instanceof GuildMember
    ? member
    : new GuildMember(client, member, guild)
}

interface UserCommandParams {
  user: User
  member: GuildMember | null
}

export class UserCommand extends Command<
  ContextMenuInteraction,
  UserCommandParams
> {
  constructor({ ...args }: CommandConstructorParams) {
    super({
      type: ApplicationCommandTypes.USER,
      ...args,
    })
  }

  override handleInteractionCreate(interaction: ContextMenuInteraction): void {
    const user = interaction.options.getUser('user', true)

    const member = interaction.guild
      ? makeMember(
          interaction.client,
          interaction.options.getMember('user', true),
          interaction.guild,
        )
      : null

    super.run(interaction, { user, member })
  }
}
