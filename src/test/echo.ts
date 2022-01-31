import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, User } from 'discord.js'
import { SlashCommand } from '../commands/SlashCommand.js'
import {
  GetBoolean,
  GetString,
  GetUsers,
  Handler,
} from '../decorators/index.js'

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

  @Handler()
  run(
    interaction: CommandInteraction,
    @GetString('message') message: string,
    @GetBoolean('ephemeral', false) ephemeral = false,
    @GetUsers('allowed_mentions', false) allowedMentions: User[] = [],
  ): void {
    const users = allowedMentions.map((user) => user.id)

    interaction.reply({
      content: message,
      ephemeral,
      allowedMentions: { users },
    })
  }
}
