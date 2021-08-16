import { APIMessage } from 'discord-api-types'
import { Client, ContextMenuInteraction, Message } from 'discord.js'
import { MessageCommand } from '../commands/CommandBuilder'

function makeMessage(
  client: Client<boolean>,
  message: Message | APIMessage,
): Message {
  return message instanceof Message ? message : new Message(client, message)
}

export function handleMessageInteraction(
  commands: Map<string, MessageCommand>,
  interaction: ContextMenuInteraction,
): void {
  console.log(
    'Handling message interaction',
    interaction.commandName,
    'args',
    interaction.options.data,
  )

  const command = commands.get(interaction.commandName)

  if (command) {
    const message = makeMessage(
      interaction.client,
      interaction.options.getMessage('message', true),
    )
    command.run(interaction, message)
  } else {
    console.error(
      `No message command found for interaction ${interaction.commandName}`,
    )
  }
}
