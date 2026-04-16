import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const resolveQualityOutputRoot = () => {
  const configuredRoot = process.env.ECOTRACK_QUALITY_OUTPUT_ROOT?.trim();

  if (configuredRoot) {
    return path.isAbsolute(configuredRoot)
      ? configuredRoot
      : path.resolve(currentDir, '..', configuredRoot);
  }

  return path.resolve(currentDir, '..', process.env.CI ? 'tmp/ci/quality' : 'tmp/quality');
};

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
    setupFiles: ['src/tests/setup.ts'],
    pool: 'threads',
    // Reusing the worker context avoids repeated Nest/bootstrap imports across files.
    isolate: false,
    // Keep file execution deterministic now that shared module state removes the import bottleneck.
    fileParallelism: false,
    hookTimeout: 60000,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: path.join(resolveQualityOutputRoot(), 'coverage', 'api'),
      all: true,
      include: [
        'src/common/trace-context.ts',
        'src/modules/auth/auth.controller.ts',
        'src/modules/auth/authenticated-user.guard.ts',
        'src/modules/auth/local-auth.controller.ts',
        'src/modules/auth/permissions.guard.ts',
        'src/modules/health/health.controller.ts',
        'src/modules/health/health.service.ts',
        'src/modules/health/root-health-routes.ts',
        'src/modules/monitoring/http-metrics.middleware.ts',
        'src/modules/monitoring/http-metrics.utils.ts',
        'src/modules/monitoring/monitoring.controller.ts',
        'src/modules/monitoring/monitoring.service.ts',
        'src/modules/tickets/tickets.controller.ts',
        'src/common/http/pagination.ts',
        'src/config/rate-limit.ts',
        'src/config/api-port.ts',
        'src/config/configuration.ts',
        'src/config/cors-origins.ts',
        'src/config/env-file.ts',
        'src/config/iot-ingestion.ts',
        'src/config/public-api-url.ts',
        'src/config/validation.ts',
        'src/common/request-id.ts',
        'src/modules/admin/admin.users.controller.ts',
        'src/modules/admin/admin.roles.repository.ts',
        'src/modules/billing/billing.controller.ts',
        'src/modules/billing/billing.service.ts',
        'src/modules/auth/auth.utils.ts',
        'src/modules/collections/routing/routing.client.ts',
        'src/modules/collections/tours.module.ts',
        'src/modules/collections/tours.service.ts',
        'src/modules/events/internal-event-schema.catalog.ts',
        'src/modules/events/internal-events.catalog.ts',
        'src/modules/events/internal-events.contracts.ts',
        'src/modules/events/internal-events.module.ts',
        'src/modules/events/internal-events.partitioning.ts',
        'src/modules/events/internal-events.runtime.ts',
        'src/modules/iot/containers.module.ts',
        'src/modules/iot/ingestion/dto/ingest-measurement.dto.ts',
        'src/modules/iot/ingestion/dto/ingestion-response.dto.ts',
        'src/modules/iot/ingestion/index.ts',
        'src/modules/iot/ingestion/ingestion.contracts.ts',
        'src/modules/iot/ingestion/ingestion.module.ts',
        'src/modules/iot/ingestion/ingestion.processor.ts',
        'src/modules/iot/ingestion/ingestion.queue.ts',
        'src/modules/iot/ingestion/ingestion.repository.ts',
        'src/modules/iot/ingestion/ingestion.service.ts',
        'src/modules/iot/validated-consumer/validated-consumer.processor.ts',
        'src/modules/iot/validated-consumer/validated-consumer.queue.ts',
        'src/modules/iot/validated-consumer/validated-consumer.service.ts',
        'src/modules/reports/citizen-reports.service.ts',
        'src/modules/routes/report-artifact.utils.ts',
        'src/modules/routes/planning.service.ts',
      ],
      exclude: ['src/tests/**'],
      thresholds: {
        statements: 85,
        branches: 70,
        functions: 85,
        lines: 85,
      },
    },
  },
});

