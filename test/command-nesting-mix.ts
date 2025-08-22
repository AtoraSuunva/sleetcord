import {
    SleetSlashCommand,
    SleetSlashCommandGroup,
    SleetSlashSubcommand,
} from '../src/index.js'

export const blacklistAddTag = new SleetSlashSubcommand(
  {
    name: 'tag',
    description: 'Add a tag to the blacklist',
  },
  {
    run: () => void 0,
  },
)

export const blacklistRemoveTag = new SleetSlashSubcommand(
  {
    name: 'tag',
    description: 'Remove a tag from the blacklist',
  },
  {
    run: () => void 0,
  },
)

export const blacklistAddSite = new SleetSlashSubcommand(
  {
    name: 'site',
    description: 'Add a site to the blacklist',
  },
  {
    run: () => void 0,
  },
)

export const blacklistRemoveSite = new SleetSlashSubcommand(
  {
    name: 'site',
    description: 'Remove a site from the blacklist',
  },
  {
    run: () => void 0,
  },
)

// --

export const blacklistAdd = new SleetSlashCommandGroup({
  name: 'add',
  description: 'Add a tag or site to the blacklist',
  options: [blacklistAddTag, blacklistAddSite],
})

export const blacklistRemove = new SleetSlashCommandGroup({
  name: 'remove',
  description: 'Remove a tag or site from the blacklist',
  options: [blacklistRemoveTag, blacklistRemoveSite],
})

export const blacklistList = new SleetSlashSubcommand(
  {
    name: 'list',
    description: 'List the tags and sites in the blacklist',
    options: [],
  },
  {
    run: () => void 0,
  },
)

// ---

// VALID
// command
// |
// |__ subcommand-group
//     |
//     |__ subcommand
// |
// |__ subcommand
export const blacklist = new SleetSlashCommand({
  name: 'blacklist',
  description: 'Blacklist tags or sites from being returned by the bot',
  options: [blacklistAdd, blacklistRemove, blacklistList],
})
