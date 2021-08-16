import { registerInteractionInGuild } from './registars/InteractionRegistrar'
import { Credentials } from './constants/Credentials'
import { commands } from './commands/Commands'

const c = commands.find((c) => c.name === 'register')
if (c) registerInteractionInGuild(Credentials.testGuildID, c)
