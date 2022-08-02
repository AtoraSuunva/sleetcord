import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [{ builder: 'rollup', input: 'src/index' }],
  declaration: true,
  rollup: {
    emitCJS: true,
    cjsBridge: true,
  },
  clean: true,
  hooks: {
    'rollup:options': (_, options) => {
      options.output![0] = {
        ...options.output![0],
        sourcemap: true,
        preserveModules: true,
        preserveModulesRoot: 'src',
      }
      options.output![1] = {
        ...options.output![1],
        sourcemap: true,
        preserveModules: true,
        preserveModulesRoot: 'src',
      }
    },
  },
})
