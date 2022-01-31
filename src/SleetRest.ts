import { REST } from '@discordjs/rest'
import {
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from 'discord-api-types/v9'
import { Logger } from 'pino'
import { baseLogger } from './utils/logger.js'

export class SleetRest {
  #logger: Logger = baseLogger.child({ name: 'SleetRest' })
  rest: REST

  constructor(token: string, public applicationId: string) {
    this.rest = new REST({ version: '9' }).setToken(token)
  }

  /**
   * Overwrites ALL commands for an application
   * @param commands The commands to put
   */
  putCommands(commands: RESTPostAPIApplicationCommandsJSONBody[]) {
    this.#logger.debug('Putting commands: %o', commands)
    return this.rest.put(Routes.applicationCommands(this.applicationId), {
      body: commands,
    })
  }

  /**
   * Overwrites ALL commands for an application in a guild
   * @param commands The commands to put
   * @param guildId The guild to put the commands in
   */
  putGuildCommands(
    commands: RESTPostAPIApplicationCommandsJSONBody[],
    guildId: string,
  ) {
    this.#logger.debug('Putting guild commands in (%s): %o', guildId, commands)
    return this.rest.put(
      Routes.applicationGuildCommands(this.applicationId, guildId),
      {
        body: commands,
      },
    )
  }
}
