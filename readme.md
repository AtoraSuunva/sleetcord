# `sleetcord`

> An interaction-first command handler for Discord.js

Sleetcord is an interaction "router" and set of helpers to make building a Discord.js bot using interactions easier

Sleetcord aims to act more like a helpful "layer" between you and Discord structures, without trying to impose any kind of file structure "magic" or requirements

**NOTE:** Sleetcord is still currently a WIP, it's usable but might be missing features or have odd bugs or edge cases

## Usage

`npm install sleetcord`

```js
const echo = new SleetSlashCommand({
  name: 'echo',
  description: 'Echoes your message!',
  // An array of permission strings can be provided and they'll be automatically parsed into a bitfield
  default_member_permissions: ['MANAGE_MESSAGES'],
  options: [{
    name: 'message',
    // You can use discord-api-types or the type number directly (ie. `3`)
    type: ApplicationCommandOptionType.String,
    description: 'The message to echo',
    required: true,
    // Autocomplete handlers can be directly attached to options
    // Sleetcord will automatically set `autocomplete: true` when serializing the body, and will call the autocomplete handler automatically
    autocomplete: (interaction, name, value) => [
      {
        name: value,
        value: `${value}!`,
      },
    ],
  }, {
    name: 'allowed_mentions',
    type: ApplicationCommandOptionType.String,
    description: 'What users to allow to mention',
  }]
}, {
  // Run is called only when `/echo` is ran
  run: async (interaction) => {
    const message = interaction.options.getString('message')
    // Accepts both @mentions or user ids, and fetches the users for you!
    const allowedMentions = (await getUsers(interaction, 'allowed_mentions')) ?? []

    const users = allowedMentions.map((user) => user.id)

    interaction.reply({
      content: message,
      ephemeral,
      allowedMentions: {
        users,
      },
    })
  },
  // Other events can also be listened to, and the respective event listeners will automatically be attached
  ready: () => {
    console.log('The bot entered READY!')
  }
})

const sleetClient = new SleetClient({
  sleet: {
    token: TOKEN,
    applicationId: APPLICATION_ID,
  },
  client: {
    intents: [],
  },
})

sleetClient.addModules([echo])
// Sleetcord will check modules for slash/user/message commands and turn them into JSON, then send them
sleetClient.putCommands()
sleetClient.login()
```

## TODO:

- Maybe live loading
  - Not supported for modules though, will cause memory leaks right now (though acceptable for dev work?)

- Add reload/put commands commands as helpful "base" commands -> separate packages?

- More helpers?
  - Probably just based on what common things I need later on, that are very common or core to sleet

- A way to lock commands to just 1+ guild?
  - guilds: ['213', '213']...

- Also better docs at some point?
