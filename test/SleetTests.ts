import { ApplicationCommandOptionType } from 'discord-api-types/v10'
import {
  autocompleteForStrings,
  getChannel,
  getMember,
  hasPermissions,
  inGuild,
  PreRunError,
  SleetMessageCommand,
  SleetModule,
  SleetSlashCommand,
  SleetSlashCommandGroup,
  SleetSlashSubcommand,
  SleetUserCommand,
} from '../src/index.js'

export const readyLogModule = new SleetModule(
  {
    name: 'readyLog',
  },
  {
    load: () => {
      console.log(`${readyLogModule.name} loaded!`)
    },
    ready: (client) => {
      console.log(`Logged in as ${client.user.tag}`)
    },
    messageReactionAdd: (messageReaction, user) => {
      console.log(
        `${user.tag} reacted with ${messageReaction.emoji.name} to ${messageReaction.message.id}`,
      )
    },
    messageDelete: (message) => {
      console.log(`Deleted message ${message.id}`)
    },
  },
)

export const slashCommand = new SleetSlashCommand(
  {
    name: 'slash-test',
    description: 'Echoes the message',
    options: [
      {
        name: 'message',
        type: ApplicationCommandOptionType.String,
        description: 'The message to echo',
        required: true,
      },
    ],
  },
  {
    run: (interaction) => {
      const message = interaction.options.getString('message', true)
      interaction.reply(message)
    },
  },
)

export const pingCommand = new SleetSlashCommand(
  {
    name: 'ping',
    description: 'Pong! Checks the bot latency',
  },
  {
    run: async function (interaction) {
      const reply = await interaction.reply({
        content: 'Ping?',
        fetchReply: true,
      })

      const wsPing = this.client.ws.ping
      const apiPing = reply.createdTimestamp - interaction.createdTimestamp
      const content = `Pong! **WS**: ${wsPing}ms, **API**: ${apiPing}ms`
      interaction.editReply(content)
    },
  },
)

const fruits = [
  'apple',
  'orange',
  'banana',
  'pear',
  'strawberry',
  'grape',
  'peach',
  'mango',
  'pineapple',
  'watermelon',
  'kiwi',
  'coconut',
  'papaya',
  'avocado',
  'cherry',
  'peach',
  'plum',
  'blackberry',
  'blueberry',
  'raspberry',
]

const vegetables = [
  'carrot',
  'potato',
  'tomato',
  'cucumber',
  'onion',
  'pepper',
  'lettuce',
  'broccoli',
  'spinach',
  'cabbage',
  'celery',
  'artichoke',
  'asparagus',
  'avocado',
  'eggplant',
  'beet',
  'bell pepper',
  'black bean',
  'black-eyed pea',
  'bok choy',
  'borlotti bean',
  'brussels sprout',
]

export const autocompleteCommand = new SleetSlashCommand(
  {
    name: 'autocomplete',
    description: 'Autocomplete to fruits',
    options: [
      {
        name: 'fruit',
        type: ApplicationCommandOptionType.String,
        description: 'The fruit you want',
        required: true,
        autocomplete: autocompleteForStrings({
          array: fruits,
        }),
      },
    ],
  },
  {
    run: (interaction) => {
      const fruit = interaction.options.getString('fruit', true)
      interaction.reply(`You picked ${fruit}!`)
    },
  },
)

const autocompleteFruit = new SleetSlashSubcommand(
  {
    name: 'fruit',
    description: 'Autocomplete to fruits',
    options: [
      {
        name: 'fruit',
        type: ApplicationCommandOptionType.String,
        description: 'The fruit you want',
        required: true,
        autocomplete: autocompleteForStrings({ array: fruits }),
      },
    ],
  },
  {
    run: (interaction) => {
      const fruit = interaction.options.getString('fruit', true)
      interaction.reply(`You picked ${fruit}!`)
    },
  },
)

const autocompleteVegetable = new SleetSlashSubcommand(
  {
    name: 'vegetable',
    description: 'Autocomplete to vegetables',
    options: [
      {
        name: 'vegetable',
        type: ApplicationCommandOptionType.String,
        description: 'The vegetable you want',
        required: true,
        autocomplete: autocompleteForStrings({ array: vegetables }),
      },
    ],
  },
  {
    run: (interaction) => {
      const vegetable = interaction.options.getString('vegetable', true)
      interaction.reply(`You picked ${vegetable}!`)
    },
  },
)

export const autocompleteFood = new SleetSlashCommand({
  name: 'food',
  description: 'Autocomplete to fruits and vegetables',
  options: [autocompleteFruit, autocompleteVegetable],
})

export const userCommand = new SleetUserCommand(
  {
    name: 'User Test',
  },
  {
    run: (interaction, user) => {
      return interaction.reply(user.username)
    },
  },
)

export const messageCommand = new SleetMessageCommand(
  {
    name: 'Message Test',
  },
  {
    run: (interaction, message) => {
      return interaction.reply(message.content)
    },
  },
)

export const userGetCommand = new SleetSlashSubcommand(
  {
    name: 'get',
    description: 'Get permissions for a user',
    options: [
      {
        name: 'user',
        description: 'The user to get permissions for',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'channel',
        description:
          'The channel permissions to get (default: Guild permissions)',
        type: ApplicationCommandOptionType.Channel,
      },
    ],
  },
  {
    run: async (interaction) => {
      // Then individual commands can also have their own permission checking
      // and should respond to the interaction!!

      console.log('Running `/permissions user get` subcommand handler...')
      hasPermissions(interaction, ['ManageRoles'])
      await interaction.deferReply()

      const member = await getMember(interaction, 'user', true)
      const channel = await getChannel(interaction, 'channel')
      const permissions = channel
        ? member.permissionsIn(channel)
        : member.permissions

      const permString = permissions.toArray().join(', ')

      interaction.editReply(
        `In ${
          channel ? `${channel}` : 'this guild'
        }, ${member} has permissions:\n${permString}`,
      )
    },
  },
)

export const userEditCommand = new SleetSlashSubcommand(
  {
    name: 'edit',
    description: 'Edit permissions for a user',
    options: [
      {
        name: 'user',
        description: 'The user to edit permissions for',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'channel',
        description:
          'The channel to edit permissions for (default: Guild permissions)',
        type: ApplicationCommandOptionType.Channel,
      },
    ],
  },
  {
    run: async (interaction) => {
      // Then individual commands can also have their own permission checking
      // and should respond to the interaction!!
      console.log('Editing for user...')
      hasPermissions(interaction, ['ManageRoles'])
      interaction.reply('Imagine this actually edited permissions')
    },
  },
)

export const userGroup = new SleetSlashCommandGroup(
  {
    name: 'user',
    description: 'Get or edit permissions for a user',
    options: [userGetCommand, userEditCommand],
  },
  {
    run: (interaction) => {
      // You can run any checks or do any logging that runs before any subcommand execution here
      // Throw an error to prevent any further execution
      // Here we check that the user provided is in the guild

      const member = interaction.options.getMember('user')

      if (!member) {
        throw new PreRunError('That user is not in the guild!')
      }

      console.log('Running `/permissions user` subcommand group handler...')
    },
  },
)

export const userPermissionsCommand = new SleetSlashCommand(
  {
    name: 'permissions',
    description: 'Get or edit permissions for a user or role',
    options: [userGroup],
  },
  {
    run: (interaction) => {
      // You can run any checks or do any logging that runs before any subcommand groups are executed here
      // Throw an error to prevent any further execution
      // Here we call the `inGuild()` guard to stop executing this command if we aren't in a guild
      inGuild(interaction)
      console.log('Running base `/permissions` command handler...')
    },
  },
)