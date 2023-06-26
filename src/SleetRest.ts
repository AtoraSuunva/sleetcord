import { REST } from 'discord.js'
import {
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from 'discord-api-types/v10'

export interface SleetRestOptions {
  token: string
  applicationId: string
}

export class SleetRest {
  applicationId: string
  rest: REST

  constructor({ token, applicationId }: SleetRestOptions) {
    this.rest = new REST({ version: '10' }).setToken(token)
    this.applicationId = applicationId
  }

  /**
   * Overwrites ALL commands for an application
   * @param commands The commands to put
   */
  putCommands(commands: RESTPostAPIApplicationCommandsJSONBody[]) {
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
    return this.rest.put(
      Routes.applicationGuildCommands(this.applicationId, guildId),
      {
        body: commands,
      },
    )
  }
}
