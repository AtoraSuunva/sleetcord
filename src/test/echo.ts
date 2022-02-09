import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, User } from 'discord.js'
import { SlashCommand } from '../commands/SlashCommand.js'
import {
  getBoolean,
  getString,
  getUsers,
} from '../decorators/inject/getters.js'
import { injectParameters } from '../decorators/inject/injectParameters.js'

export class EchoCommand extends SlashCommand {
  constructor() {
    const echoBuilder = new SlashCommandBuilder()
      .setName('echo')
      .setDescription('Echoes the message')
      .addStringOption((opt) =>
        opt
          .setName('message')
          .setDescription('The message to echo')
          .setRequired(true),
      )
      .addBooleanOption((opt) =>
        opt.setName('ephemeral').setDescription('Ephemeral echo'),
      )
      .addStringOption((opt) =>
        opt
          .setName('allowed_mentions')
          .setDescription('What users to allow to mention'),
      )

    super(echoBuilder.toJSON())
  }

  @injectParameters()
  run(
    interaction: CommandInteraction,
    @getString('message') message: string,
    @getBoolean('ephemeral', false) ephemeral = false,
    @getUsers('allowed_mentions', false) allowedMentions: User[] = [],
  ): Promise<void> {
    const users = allowedMentions.map((user) => user.id)

    return interaction.reply({
      content: message,
      ephemeral,
      allowedMentions: { users },
    })
  }
}
