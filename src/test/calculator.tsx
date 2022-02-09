import { SlashCommandBuilder } from '@discordjs/builders'
import { CommandInteraction, Message } from 'discord.js'
import { SlashCommand } from '../commands/SlashCommand.js'
import { DiscordComponents, MessageActionRow, MessageButton } from 'discord.tsx'

type tsx = ReturnType<typeof DiscordComponents['Fragment']>

export class CalculatorCommand extends SlashCommand {
  constructor() {
    const calculatorBuilder = new SlashCommandBuilder()
      .setName('calculator')
      .setDescription('Opens a calculator')

    super(calculatorBuilder.toJSON())
  }

  async run(interaction: CommandInteraction) {
    const componentData: tsx = (
      <>
        <MessageActionRow>
          <MessageButton style="PRIMARY" label="7" customId="7" />
          <MessageButton style="PRIMARY" label="8" customId="8" />
          <MessageButton style="PRIMARY" label="9" customId="9" />
          <MessageButton style="SECONDARY" label="/" customId="/" />
        </MessageActionRow>
        <MessageActionRow>
          <MessageButton style="PRIMARY" label="4" customId="4" />
          <MessageButton style="PRIMARY" label="5" customId="5" />
          <MessageButton style="PRIMARY" label="6" customId="6" />
          <MessageButton style="SECONDARY" label="*" customId="*" />
        </MessageActionRow>
        <MessageActionRow>
          <MessageButton style="PRIMARY" label="1" customId="1" />
          <MessageButton style="PRIMARY" label="2" customId="2" />
          <MessageButton style="PRIMARY" label="3" customId="3" />
          <MessageButton style="SECONDARY" label="-" customId="-" />
        </MessageActionRow>
        <MessageActionRow>
          <MessageButton style="PRIMARY" label="0" customId="0" />
          <MessageButton style="SECONDARY" label="." customId="." />
          <MessageButton style="SUCCESS" label="=" customId="=" />
          <MessageButton style="SECONDARY" label="+" customId="+" />
        </MessageActionRow>
      </>
    )

    const message: Message = (await interaction.reply({
      content: '=',
      fetchReply: true,
      ephemeral: true,
      ...componentData,
    })) as Message

    const collector = message.createMessageComponentCollector({
      componentType: 'BUTTON',
    })

    collector.on('collect', (i) => {
      let content = i.message.content

      if (i.customId === '=') {
        content = `=${eval(content.substring(1))}`
      } else {
        content += i.customId
      }

      i.update({ content })
    })
  }
}
