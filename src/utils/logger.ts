import { pino } from 'pino'

export const baseLogger = pino({
  level:
    process.env.SLEETCORD_LOG_LEVEL ??
    (process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),
})
