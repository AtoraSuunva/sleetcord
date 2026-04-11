import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: true,
  unbundle: true,
  deps: {
    skipNodeModulesBundle: true,
  },
})
