import { ApplicationCommandOptionType } from 'discord-api-types/v10'
import {
  autocompleteForStrings,
  getChannel,
  getMember,
  hasPermissionsGuard,
  inGuildGuard,
  PreRunError,
  SleetMessageCommand,
  SleetModule,
  SleetSlashCommand,
  SleetSlashCommandGroup,
  SleetSlashSubcommand,
  SleetUserCommand,
} from '../src/index.js'
import { runningModuleStore } from '../src/SleetClient.js'

export const readyLogModule = new SleetModule(
  {
    name: 'readyLog',
  },
  {
    load: () => {
      console.log(`${readyLogModule.name} loaded!`)
    },
    clientReady: (client) => {
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
    run: async (interaction) => {
      const message = interaction.options.getString('message', true)
      await interaction.reply(message)
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
      await interaction.editReply(content)
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
    run: async (interaction) => {
      const fruit = interaction.options.getString('fruit', true)
      await interaction.reply(`You picked ${fruit}!`)
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
    run: async (interaction) => {
      const fruit = interaction.options.getString('fruit', true)
      await interaction.reply(`You picked ${fruit}!`)
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
    run: async (interaction) => {
      const vegetable = interaction.options.getString('vegetable', true)
      await interaction.reply(`You picked ${vegetable}!`)
    },
  },
)

// VALID
// command
// |
// |__ subcommand
// |
// |__ subcommand
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
      hasPermissionsGuard(interaction, ['ManageRoles'])
      await interaction.deferReply()

      const member = await getMember(interaction, 'user', true)
      const channel = await getChannel(interaction, 'channel')
      const permissions = channel
        ? member.permissionsIn(channel)
        : member.permissions

      const permString = permissions.toArray().join(', ')

      await interaction.editReply(
        `In ${
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          channel ? channel.toString() : 'this guild'
        }, ${member.toString()} has permissions:\n${permString}`,
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
      hasPermissionsGuard(interaction, ['ManageRoles'])
      await interaction.reply('Imagine this actually edited permissions')
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

// VALID
// command
// |
// |__ subcommand-group
//     |
//     |__ subcommand
// |
// |__ subcommand-group
//     |
//     |__ subcommand
export const userPermissionsCommand = new SleetSlashCommand(
  {
    name: 'permissions',
    description: 'Get or edit permissions for a user or role',
    dm_permission: false,
    options: [userGroup],
  },
  {
    run: (interaction) => {
      // You can run any checks or do any logging that runs before any subcommand groups are executed here
      // Throw an error to prevent any further execution
      // Here we call the `inGuildGuard()` guard to stop executing this command if we aren't in a guild
      inGuildGuard(interaction)
      console.log('Running base `/permissions` command handler...')
    },
  },
)

const childModule = new SleetModule(
  {
    name: 'Child Module',
  },
  {
    messageCreate: (message) => {
      const module = runningModuleStore.getStore()

      console.log(
        `the child module saw an event (from ${module?.name})`,
        message.content,
      )
    },
  },
)

const moduleChildSlashCommand = new SleetSlashCommand(
  {
    name: 'child_slash_command',
    description: 'Child slash command',
  },
  {
    run: async (interaction) => {
      const module = runningModuleStore.getStore()
      await interaction.reply(
        `Child slash command running from ${module?.name}`,
      )
    },
  },
)

export const parentModule = new SleetModule(
  {
    name: 'Parent Module',
  },
  {
    messageCreate: (message) => {
      console.log('the parent module saw an event', message.content)
    },
  },
  [childModule, moduleChildSlashCommand],
)

const childSlashCommand = new SleetSlashSubcommand(
  {
    name: 'child',
    description: 'Child slash command',
  },
  {
    run: async (interaction) => {
      await interaction.reply('Child slash command')
    },
    messageCreate: (message) => {
      console.log('child slash msg:', message.content)
    },
  },
)

const childSlashCommandGroup = new SleetSlashCommandGroup(
  {
    name: 'group',
    description: 'Child slash command group',
    options: [childSlashCommand],
  },
  {
    messageCreate: (message) => {
      console.log('child slash group msg:', message.content)
    },
  },
)

export const parentSlashCommand = new SleetSlashCommand(
  {
    name: 'parent',
    description: 'Parent slash command',
    options: [childSlashCommandGroup],
  },
  {
    messageCreate: (message) => {
      console.log('parent slash msg:', message.content)
    },
  },
)

export const eventLogger = new SleetModule(
  {
    name: 'eventLogger',
  },
  {
    eventHandled(eventDetails, module) {
      console.log(
        `- Event ${eventDetails.name} handled by module ${module.name}`,
      )

      if (eventDetails.name === 'messageCreate') {
        console.log('  -> Message content:', eventDetails.arguments[0].content)
      }
    },
  },
)

export const moduleFilter = new SleetModule(
  {
    name: 'moduleFilter',
  },
  {
    shouldSkipEvent(eventDetails, module) {
      if (eventDetails.name === 'messageCreate') {
        console.log('checking messageCreate for', module.name)
        if (eventDetails.arguments[0].content === '!ignore-this') {
          return {
            message: 'Message content was "!ignore-this"',
          }
        }
      }

      if (eventDetails.name === 'interactionCreate') {
        const interaction = eventDetails.arguments[0]

        if (interaction.isChatInputCommand()) {
          if (
            interaction.options.data.some((d) =>
              d.value?.toString().includes('!!!ignore!!!'),
            )
          ) {
            return {
              message: 'Command option value included "!!!ignore!!!"',
            }
          }
        }
      }

      return false
    },
    eventSkipped(eventDetails, module, skipper, reason) {
      console.log(
        `Event '${eventDetails.name}' for '${module.name}' was skipped by '${skipper.name}' for '${reason.message}'`,
      )
    },
  },
)
