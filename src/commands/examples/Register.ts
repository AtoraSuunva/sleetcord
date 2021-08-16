import { ApplicationCommandOptionType } from 'discord-api-types'
import { Subcommand, SlashCommand } from '../CommandBuilder'

const registerSingle = new Subcommand('single', 'Register a single command')
  .addOption(
    'name',
    'The name of the command to register',
    ApplicationCommandOptionType.String,
    true,
  )
  .addOption(
    'global',
    'Register this command globally',
    ApplicationCommandOptionType.Boolean,
  )
  .onInteractionCreate((interaction) => {
    const name = interaction.options.getString('name', true)
    const global = interaction.options.getBoolean('global') || false

    console.log(`Register ${name} globally? ${global}`)
  })

const registerAll = new Subcommand('all', 'Register all commands')
  .addOption(
    'global',
    'Register all commands globally',
    ApplicationCommandOptionType.Boolean,
  )
  .onInteractionCreate((interaction) => {
    const global = interaction.options.getBoolean('global') || false

    console.log(`Register all commands globally? ${global}`)
  })

export default new SlashCommand('register', 'Registers commands', {
  devGuildOnly: true,
})
  .addSubcommand(registerSingle)
  .addSubcommand(registerAll)
