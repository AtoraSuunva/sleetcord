import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  platform: 'node',
  // format: ['esm', 'cjs'],
  format: ['esm'],
  target: 'es2022',
  skipNodeModulesBundle: true,
  clean: true,
  minify: false,
  keepNames: true,
  dts: true,
  sourcemap: true,
  splitting: true,
})
