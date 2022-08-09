import { REST } from '@discordjs/rest'
import {
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from 'discord-api-types/v10'
import { Logger } from 'pino'

export interface SleetRestOptions {
  token: string
  applicationId: string
  logger: Logger
}

export class SleetRest {
  applicationId: string
  #logger: Logger
  rest: REST

  constructor({ token, applicationId, logger }: SleetRestOptions) {
    this.rest = new REST({ version: '10' }).setToken(token)
    this.applicationId = applicationId
    this.#logger = logger.child({ name: 'SleetRest' })
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
