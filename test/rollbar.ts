import Rollbar from 'rollbar'

const rollbar = new Rollbar({
  accessToken: '<token>',
  captureUncaught: true,
  captureUnhandledRejections: true,

  payload: {
    client: {
      javascript: {
        source_map_enabled: true,
        code_version: '0.0.1',
        guess_uncaught_frames: true,
      },
    },
  },
})

try {
  throw new Error('Something went wrong')
} catch (e) {
  rollbar.error(e as any)
}
