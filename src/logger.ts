import pino from 'pino'

export const baseLogger = pino({
  name: 'Sleet',
  level: 'debug',
  base: undefined,
  transport: {
    target: 'pino-pretty',
  },
  prettyPrint: {
    translateTime: true,
  },
})
