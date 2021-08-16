import { REST } from '@discordjs/rest'
import { APIApplicationCommand, Routes } from 'discord-api-types/v9'
import { Credentials } from '../constants/Credentials'

const rest = new REST({ version: '9' }).setToken(Credentials.token)

const validProps = [
  'id',
  'application_id',
  'guild_id',
  'name',
  'description',
  'options',
  'default_permission',
  'type',
]

// Interactions can be registered with only name, description, and type, but the type
// doesn't reflect that (it reflects API return)
type APIRegisterInteraction = Partial<APIApplicationCommand> & {
  name: string
  type: number
}

/**
 * Remove everything that isn't part of the "expected" props for the API
 * @param interaction The interaction to "prune"
 * @returns Something the API should be fine with
 */
function getExpectedAPIProps(
  interaction: APIRegisterInteraction,
): APIRegisterInteraction {
  return validProps.reduce((o, k) => {
    if (k in interaction) {
      o[k] = interaction[k as keyof APIRegisterInteraction]
    }
    return o
  }, {} as Record<string, unknown>) as unknown as APIRegisterInteraction
}

/**
 * Registers 1 interaction to a specific guild
 * @param guildID The guild to register in
 * @param interactions The interaction to register in that guild
 */
export async function registerInteractionInGuild(
  guildID: string,
  interaction: APIRegisterInteraction,
): Promise<void> {
  console.log('Registering interaction in guild', guildID, interaction.name)

  const apiInteraction = getExpectedAPIProps(interaction)
  const route = Routes.applicationGuildCommands(Credentials.clientID, guildID)
  const body = {
    body: apiInteraction,
  }

  try {
    await rest.post(route, body)
  } catch (e) {
    console.error('Failed to register interaction:', e)
  }
}

/**
 * Register 1 or more interactions to a specific guild, overwriting all the old interactions
 * @param guildID The guild to register in
 * @param interactions The interactions to bulk register in that guild
 */
export async function bulkRegisterInteractionsInGuild(
  guildID: string,
  interactions: APIRegisterInteraction[],
): Promise<void> {
  console.log(
    'Bulk registering interactions in guild',
    guildID,
    interactions.map((c) => c.name),
  )

  const apiInteractions = interactions.map(getExpectedAPIProps)
  const route = Routes.applicationGuildCommands(Credentials.clientID, guildID)
  const body = {
    body: apiInteractions,
  }

  try {
    await rest.put(route, body)
  } catch (e) {
    console.error('Failed to register interactions:', e)
  }
}

/**
 * Registers 1 interaction globally
 * @param interaction The interaction to register
 */
export async function registerInteractionGlobally(
  interaction: APIRegisterInteraction,
): Promise<void> {
  console.log('Registering interaction globally', interaction.name)

  const apiInteractions = getExpectedAPIProps(interaction)
  const route = Routes.applicationCommands(Credentials.clientID)
  const body = {
    body: apiInteractions,
  }

  try {
    await rest.post(route, body)
  } catch (e) {
    console.error('Failed to register interaction:', e)
  }
}

/**
 * Registers 1 or more interactions globally, overwriting all existing interactions
 * @param interactions The interactions to register
 */
export async function bulkRegisterInteractionsGlobally(
  interactions: APIRegisterInteraction[],
): Promise<void> {
  console.log(
    'Registering interactions globally',
    interactions.map((c) => c.name),
  )

  const apiInteractions = interactions.map(getExpectedAPIProps)
  const route = Routes.applicationCommands(Credentials.clientID)
  const body = {
    body: apiInteractions,
  }

  try {
    await rest.put(route, body)
  } catch (e) {
    console.error('Failed to register interactions:', e)
  }
}
