import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      // index.ts is the bin entry, and ingest.ts spawns the claude-code agent,
      // so neither runs under CI.
      // The pipeline logic they call lives in compose.ts and run.ts, which the tests cover.
      exclude: ['src/index.ts', 'src/ingest.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
