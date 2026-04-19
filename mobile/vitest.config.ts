import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const mobileTestSuite = (process.env.ECOTRACK_MOBILE_TEST_SUITE ?? "all").trim().toLowerCase();
const mobileUiTestFiles = [
  "src/tests/AgentHomeScreen.test.tsx",
  "src/tests/LoginScreen.test.tsx",
  "src/tests/ManagerHomeScreen.test.tsx",
  "src/tests/ReactQueryLifecycleProvider.test.tsx",
  "src/tests/ReportScreen.test.tsx",
  "src/tests/SessionProvider.test.tsx",
];
const mobileTestInclude = mobileTestSuite === "ui"
  ? mobileUiTestFiles
  : ["src/tests/**/*.test.ts", "src/tests/**/*.test.tsx"];
const mobileTestExclude = mobileTestSuite === "fast" ? mobileUiTestFiles : [];
const mobileUsesSharedSuiteContext = mobileTestSuite === "fast" || mobileTestSuite === "ui";
const resolveQualityOutputRoot = () => {
  const configuredRoot = process.env.ECOTRACK_QUALITY_OUTPUT_ROOT?.trim();

  if (configuredRoot) {
    return path.isAbsolute(configuredRoot)
      ? configuredRoot
      : path.resolve(rootDirectory, "..", configuredRoot);
  }

  return path.resolve(rootDirectory, "..", process.env.CI ? "tmp/ci/quality" : "tmp/quality");
};

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react"
  },
  resolve: {
    alias: {
      react: path.resolve(rootDirectory, "node_modules/react"),
      "react/jsx-runtime": path.resolve(rootDirectory, "node_modules/react/jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(rootDirectory, "node_modules/react/jsx-dev-runtime.js"),
      "react-dom": path.resolve(rootDirectory, "node_modules/react-dom"),
      "react-dom/client": path.resolve(rootDirectory, "node_modules/react-dom/client.js"),
      "@": path.resolve(rootDirectory, "src"),
      "@api": path.resolve(rootDirectory, "src/api"),
      "react-native": path.resolve(rootDirectory, "src/tests/shims/react-native.tsx"),
      "expo-constants": path.resolve(rootDirectory, "src/tests/shims/expo-constants.ts"),
      "expo-notifications": path.resolve(rootDirectory, "src/tests/shims/expo-notifications.ts")
    }
  },
  test: {
    environment: "jsdom",
    include: mobileTestInclude,
    exclude: mobileTestExclude,
    setupFiles: ["./src/tests/setup.tsx"],
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    pool: "forks",
    isolate: !mobileUsesSharedSuiteContext,
    fileParallelism: false,
    maxWorkers: 1,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html", "lcov"],
      reportsDirectory: path.join(resolveQualityOutputRoot(), "coverage", "mobile"),
      exclude: ["src/tests/**", "**/*.d.ts", "**/node_modules/**", "**/*.config.*"],
      include: [
        "src/api/core/http.ts",
        "src/components/AppStateScreen.tsx",
        "src/features/agent/AgentHomeScreen.tsx",
        "src/features/agent/agentActivity.ts",
        "src/features/auth/LoginScreen.tsx",
        "src/features/manager/ManagerHomeScreen.tsx",
        "src/features/manager/reporting.ts",
        "src/features/reports/reportFlow.ts",
        "src/lib/roleRoutes.ts",
        "src/providers/ReactQueryLifecycleProvider.tsx",
        "src/providers/SessionProvider.tsx"
      ],
      thresholds: {
        // The native reporting screen still has route-level tests, but its
        // map/device branches are validated separately because jsdom cannot
        // exercise the installed-app rendering path with hardware APIs.
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80
      }
    }
  }
});
