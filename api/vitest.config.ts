import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    target: 'es2022',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        useDefineForClassFields: false,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    pool: 'threads',
    // Nest integration-style suites can starve each other under file-level parallelism on Windows CI/dev.
    // Keep API tests deterministic for full monorepo runs.
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      all: true,
      include: [
        'src/auth/auth.controller.ts',
        'src/auth/authenticated-user.guard.ts',
        'src/auth/permissions.guard.ts',
        'src/tickets/tickets.controller.ts',
        'src/monitoring/monitoring.controller.ts',
        'src/common/http/pagination.ts',
        'src/common/request-id.ts',
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
