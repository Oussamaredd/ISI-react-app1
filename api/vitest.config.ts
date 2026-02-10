import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    hookTimeout: 30000,
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      all: true,
      include: [
        'src/auth/auth.controller.ts',
        'src/auth/auth.service.ts',
        'src/auth/auth.utils.ts',
        'src/auth/authenticated-user.guard.ts',
        'src/auth/permissions.guard.ts',
        'src/hotels/hotels.controller.ts',
        'src/tickets/tickets.controller.ts',
        'src/monitoring/monitoring.controller.ts',
      ],
      exclude: ['src/tests/**'],
      thresholds: {
        statements: 75,
        branches: 60,
        functions: 75,
        lines: 75,
      },
    },
  },
});
