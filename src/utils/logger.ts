import pino from 'pino'

export const baseLogger = pino({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      translateTime: 'SYS:standard',
    },
  },
})
