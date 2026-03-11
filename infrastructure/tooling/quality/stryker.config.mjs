export default {
  mutate: [
    "api/src/common/request-id.ts",
    "api/src/common/trace-context.ts",
    "api/src/modules/health/**/*.ts",
    "api/src/modules/monitoring/**/*.ts",
    "api/src/modules/auth/auth.service.ts",
  ],
  testRunner: "command",
  commandRunner: {
    command:
      "npm run build --workspace=ecotrack-database && npm run test --workspace=ecotrack-api -- --run src/tests/request-id.test.ts src/tests/trace-context.test.ts src/tests/health.controller.test.ts src/tests/health.service.test.ts src/tests/health-routes.test.ts src/tests/root-health-routes.test.ts src/tests/monitoring.test.ts src/tests/monitoring-http-metrics.test.ts src/tests/auth.service.test.ts src/tests/rate-limiting.test.ts",
  },
  reporters: ["clear-text", "progress", "html"],
  coverageAnalysis: "off",
  thresholds: {
    high: 80,
    low: 70,
    break: 60,
  },
  tempDirName: "tmp/ci/stryker",
};
