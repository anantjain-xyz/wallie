import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    globals: true,
    setupFiles: ['./servers/test-setup.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'src/**',
      // Integration test that expects a running API server
      'servers/api-server/github-webhook.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      all: true,
      include: ['servers/**/*.ts'],
      exclude: [
        'servers/**/*.test.ts',
        'servers/test-setup.ts',
        'servers/api-server/index.ts',
        'servers/supabase.ts',
      ],
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
  },
}); 