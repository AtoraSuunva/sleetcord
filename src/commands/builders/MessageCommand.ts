import { APIMessage } from 'discord-api-types/payloads/v9'
import { Client, ContextMenuInteraction, Message } from 'discord.js'
import { ApplicationCommandTypes } from '../../constants/ApplicationCommandTypes'
import { Command, CommandConstructorParams } from './Command'

function makeMessage(
  client: Client<boolean>,
  message: Message | APIMessage,
): Message {
  return message instanceof Message ? message : new Message(client, message)
}

interface MessageCommandParams {
  message: Message
}

export class MessageCommand extends Command<
  ContextMenuInteraction,
  MessageCommandParams
> {
  constructor({ ...args }: CommandConstructorParams) {
    super({
      type: ApplicationCommandTypes.MESSAGE,
      ...args,
    })
  }

  override handleInteractionCreate(interaction: ContextMenuInteraction): void {
    const message = makeMessage(
      interaction.client,
      interaction.options.getMessage('message', true),
    )

    super.run(interaction, { message })
  }
}
