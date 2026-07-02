const { register } = require('ts-node');

register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2017',
    moduleResolution: 'node',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    skipLibCheck: true,
    strict: false,
    noImplicitAny: false,
    baseUrl: '.',
    paths: {
      '@/*': ['./src/*']
    }
  }
});

module.exports = {
  require: [
    'features/support/world.js',
    'features/support/hooks.js',
    'features/step_definitions/auth.steps.js',
    'features/tracks/step_definitions/track.steps.js'
  ],
  format: ['@cucumber/pretty-formatter'],
  paths: ['features/**/*.feature'],
  formatOptions: {
    snippetInterface: 'async-await'
  },
  timeout: 30000
}; 