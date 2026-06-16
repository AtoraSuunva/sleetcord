import { defineConfig } from 'vite-plus'

export default defineConfig({
  fmt: {
    singleQuote: true,
    semi: false,
    sortImports: {},
    ignorePatterns: ['dist/**'],
  },
  lint: {
    categories: {
      correctness: 'error',
      suspicious: 'error',
      perf: 'error',
    },
    plugins: ['eslint', 'typescript', 'unicorn', 'oxc', 'jsdoc', 'promise', 'import'],
    rules: {
      'import/extensions': ['error', { ts: 'always', js: 'never' }],
      'no-param-reassign': 'error',
      'default-param-last': 'error',
      'prefer-enum-initializers': 'error',
      'no-inferrable-types': 'error',
      // We use this in autocomplete functions.
      'no-this-in-exported-function': 'allow',
      // Most shadowing is fine.
      'no-shadow': 'allow',
      // Message ordering is often important and we have to work with ratelimits.
      'no-await-in-loop': 'allow',
      // We are smarter than the compiler :)
      'no-unsafe-type-assertion': 'allow',
    },
    ignorePatterns: ['dist/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  staged: {
    '*.{js,ts,tsx,mjs,cjs,jsx}': 'vp check --fix',
    '*.{md,json,yml,yaml}': 'vp fmt --write',
  },
  pack: {
    entry: 'src/index.ts',
    platform: 'node',
    format: 'esm',
    target: 'node24',
    sourcemap: true,
    unbundle: true,
    deps: {
      skipNodeModulesBundle: true,
    },
  },
})
