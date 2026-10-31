import { defineConfig } from 'vitest/config';

const AT_LEAST_70 = { statements: 70, branches: 70, functions: 70, lines: 70 };

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test/**', 'src/types/**', 'src/index.ts'],
      reporter: ['text-summary', 'text'],
      // Phase 7 "Done when": >= 70% on the Spotify client and the routes.
      thresholds: {
        'src/spotify/**': AT_LEAST_70,
        'src/routes/**': AT_LEAST_70,
      },
    },
  },
});
