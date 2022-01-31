import { ApplicationCommandOptionType } from 'discord-api-types/payloads/v9'
import { SlashCommand } from '../builders/SlashCommand'
import { Subcommand } from '../builders/Subcommand'

const registerSingle = new Subcommand<{
  name: string
  global?: boolean
}>({
  name: 'single',
  description: 'Register a single command',
})
  .addOption({
    name: 'name',
    description: 'The name of the command to register',
    type: ApplicationCommandOptionType.String,
    required: true,
  })
  .addOption({
    name: 'global',
    description: 'Register this command globally',
    type: ApplicationCommandOptionType.Boolean,
  })
  .onInteractionCreate((interaction, params) => {
    const { name, global } = params
    interaction.reply({
      content: `Register ${name} globally? ${global}`,
      ephemeral: true,
    })
  })

const registerAll = new Subcommand<{
  global?: boolean
}>({
  name: 'all',
  description: 'Register all commands',
})
  .addOption({
    name: 'global',
    description: 'Register all commands globally',
    type: ApplicationCommandOptionType.Boolean,
  })
  .onInteractionCreate((interaction, params) => {
    const { global } = params
    interaction.reply({
      content: `Register all commands globally? ${global}`,
      ephemeral: true,
    })
  })

export default new SlashCommand({
  name: 'register',
  description: 'Registers commands',
  devGuildOnly: true,
})
  .addSubcommand(registerSingle)
  .addSubcommand(registerAll)
