export interface CommandOptions {
  devGuildOnly: boolean
}

export type CommandRunnable<T, P> = (interaction: T, params: P) => void
