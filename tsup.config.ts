import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'es2022',
  skipNodeModulesBundle: true,
  clean: true,
  minify: false,
  keepNames: true,
  dts: true,
  sourcemap: true,
})
