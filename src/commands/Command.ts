import { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/rest/v9'

export abstract class Command {
  name: string

  constructor(public body: RESTPostAPIApplicationCommandsJSONBody) {
    this.name = body.name
  }
}
