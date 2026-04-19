import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const spawnRestricted = process.env.ECOTRACK_VITE_SPAWN_RESTRICTED === "1";
const includeAppE2E = process.env.ECOTRACK_INCLUDE_APP_E2E === "1";
const appTestSuite = (process.env.ECOTRACK_APP_TEST_SUITE ?? "all").trim().toLowerCase();
const appUiTestFiles = [
  "src/tests/AdminTicketManagement.test.tsx",
  "src/tests/AdvancedTicketList.test.tsx",
  "src/tests/AgentTourPage.test.tsx",
  "src/tests/App.integration.test.tsx",
  "src/tests/App.test.tsx",
  "src/tests/AppHomePage.test.tsx",
  "src/tests/AuditLogs.test.tsx",
  "src/tests/AuthCallbackPage.test.tsx",
  "src/tests/CitizenChallengesPage.test.tsx",
  "src/tests/CitizenProfilePage.test.tsx",
  "src/tests/CitizenReportPage.test.tsx",
  "src/tests/CreateTicket.test.tsx",
  "src/tests/Dashboard.test.tsx",
  "src/tests/LoginPage.test.tsx",
  "src/tests/ManagerPlanningPage.test.tsx",
  "src/tests/ManagerReportsPage.test.tsx",
  "src/tests/ManagerToursPage.test.tsx",
  "src/tests/ResetPasswordPage.test.tsx",
  "src/tests/Routing.test.tsx",
  "src/tests/SettingsPage.test.tsx",
  "src/tests/SystemSettings.test.tsx",
  "src/tests/TicketDetails.test.tsx",
  "src/tests/TicketList.test.tsx",
  "src/tests/UserCreateModal.test.tsx",
];
const appIsolatedTestFiles = [
  "src/tests/useAuth.localStorage.test.tsx",
  "src/tests/useDashboard.test.tsx",
  "src/tests/useTickets.test.tsx",
];
const appTestInclude = appTestSuite === "ui"
  ? appUiTestFiles
  : appTestSuite === "isolated"
  ? appIsolatedTestFiles
  : ["src/tests/**/*.test.ts", "src/tests/**/*.test.tsx"];
const appSuiteExcludes = [
  ...(includeAppE2E ? [] : ["src/tests/e2e.key-journeys.test.tsx"]),
  ...(appTestSuite === "fast" ? [...appUiTestFiles, ...appIsolatedTestFiles] : []),
];
const appTestPool = appTestSuite === "ui" ? "forks" : "forks";
const appTestFileParallelism = false;
const appTestMaxWorkers = 1;
const appUsesSharedSuiteContext = appTestSuite === "fast" || appTestSuite === "ui";
const resolveQualityOutputRoot = () => {
  const configuredRoot = process.env.ECOTRACK_QUALITY_OUTPUT_ROOT?.trim();

  if (configuredRoot) {
    return path.isAbsolute(configuredRoot)
      ? configuredRoot
      : path.resolve(currentDir, "..", configuredRoot);
  }

  return path.resolve(currentDir, "..", process.env.CI ? "tmp/ci/quality" : "tmp/quality");
};

const normalizeProxyTargetOrigin = (value, key) => {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid absolute URL.`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${key} must use http or https.`);
  }

  parsed.pathname = "";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
};

const createCloudflarePagesRedirectsPlugin = ({
  edgeProxyEnabled,
  edgeProxyTargetOrigin,
}) => ({
  name: "ecotrack-cloudflare-pages-redirects",
  apply: "build",
  generateBundle() {
    const redirectRules = [];

    if (edgeProxyEnabled) {
      if (!edgeProxyTargetOrigin) {
        throw new Error(
          "EDGE_PROXY_TARGET_ORIGIN is required when VITE_USE_EDGE_API_PROXY=true.",
        );
      }

      const normalizedTarget = normalizeProxyTargetOrigin(
        edgeProxyTargetOrigin,
        "EDGE_PROXY_TARGET_ORIGIN",
      );

      redirectRules.push(`/api/* ${normalizedTarget}/api/:splat 200`);
      redirectRules.push(`/health ${normalizedTarget}/health 200`);
    }

    redirectRules.push("/* /index.html 200");

    this.emitFile({
      type: "asset",
      fileName: "_redirects",
      source: `${redirectRules.join("\n")}\n`,
    });
  },
});

const createSpawnRestrictedDepOptimizerPlugin = () => ({
  name: "ecotrack-spawn-restricted-dep-optimizer",
  apply: "serve",
  configResolved(resolvedConfig) {
    resolvedConfig.optimizeDeps.noDiscovery = true;
    resolvedConfig.optimizeDeps.include = [];
  },
});

const createHtmlReleaseMetadataPlugin = (releaseVersion) => ({
  name: "ecotrack-html-release-metadata",
  transformIndexHtml(html) {
    return html.replace("__ECOTRACK_RELEASE_VERSION__", releaseVersion ?? "");
  },
});

const resolveManualChunkName = (id) => {
  const normalizedId = id.split(path.sep).join("/");

  if (normalizedId.includes("/leaflet/")) {
    return "mapping-vendor";
  }

  if (normalizedId.includes("/node_modules/")) {
    if (normalizedId.includes("/react-dom/") || normalizedId.includes("/scheduler/")) {
      return "react-dom-vendor";
    }

    if (normalizedId.includes("react-router")) {
      return "router-vendor";
    }

    if (normalizedId.includes("@tanstack/react-query")) {
      return "query-vendor";
    }

    if (normalizedId.includes("@sentry/")) {
      return "observability-vendor";
    }

    if (normalizedId.includes("lucide-react")) {
      return "icons-vendor";
    }

    if (
      normalizedId.includes("class-variance-authority") ||
      normalizedId.includes("clsx") ||
      normalizedId.includes("tailwind-merge")
    ) {
      return "ui-vendor";
    }

    return undefined;
  }

  return undefined;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE || "/";
  const edgeProxyEnabled = env.VITE_USE_EDGE_API_PROXY === "true";
  const edgeProxyTargetOrigin = env.EDGE_PROXY_TARGET_ORIGIN?.trim() ?? "";
  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
  const sentryOrganization = process.env.SENTRY_ORG?.trim();
  const sentryProject = process.env.SENTRY_PROJECT?.trim();
  const sentryRelease = env.VITE_RELEASE_VERSION?.trim() || process.env.SENTRY_RELEASE?.trim();
  const sentrySourceMapsEnabled = Boolean(sentryAuthToken && sentryOrganization && sentryProject);

  const plugins = [
    react(),
    createHtmlReleaseMetadataPlugin(env.VITE_RELEASE_VERSION?.trim() || ""),
    createCloudflarePagesRedirectsPlugin({
      edgeProxyEnabled,
      edgeProxyTargetOrigin,
    }),
  ];

  if (spawnRestricted) {
    plugins.push(createSpawnRestrictedDepOptimizerPlugin());
  }

  if (sentrySourceMapsEnabled) {
    plugins.push(
      ...sentryVitePlugin({
        authToken: sentryAuthToken,
        org: sentryOrganization,
        project: sentryProject,
        release: sentryRelease
          ? {
              name: sentryRelease,
            }
          : undefined,
        sourcemaps: {
          assets: "./dist/**/*.{js,map}",
          filesToDeleteAfterUpload: ["./dist/**/*.map"],
        },
      }),
    );
  }

  return {
    base,
    define: {
      __SENTRY_DEBUG__: false,
      __SENTRY_TRACING__: false,
    },
    plugins,
    root: ".",
    optimizeDeps: spawnRestricted
      ? {
          noDiscovery: true,
          include: [],
        }
      : undefined,
    build: {
      ...(spawnRestricted
        ? {
            minify: false,
          }
        : {}),
      manifest: true,
      sourcemap: sentrySourceMapsEnabled,
      rollupOptions: {
        output: {
          manualChunks: resolveManualChunkName,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(currentDir, "./src"),
      },
      dedupe: ["react", "react-dom", "@tanstack/react-query"],
    },
    server: {
      port: 5173,
      open: !spawnRestricted,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: true,
          xfwd: true,
        },
        '/health': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          xfwd: true,
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/tests/setup.tsx",
      css: true,
      include: appTestInclude,
      exclude: appSuiteExcludes,
      clearMocks: true,
      restoreMocks: true,
      unstubGlobals: true,
      unstubEnvs: true,
      // Reuse a single jsdom context for the split fast/UI lanes, while keeping
      // the default all-files and isolated lanes on per-file module isolation.
      pool: appTestPool,
      isolate: !appUsesSharedSuiteContext,
      fileParallelism: appTestFileParallelism,
      maxWorkers: appTestMaxWorkers,
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "json-summary", "html", "lcov"],
        reportsDirectory: path.join(resolveQualityOutputRoot(), "coverage", "app"),
        exclude: [
          "src/tests/**",
          "**/*.d.ts",
          "**/node_modules/**",
          "**/*.config.*",
          ...(includeAppE2E ? [] : ["src/tests/e2e.key-journeys.test.tsx"]),
        ],
        include: [
          "src/App.tsx",
          "src/components/landing/sections/HeroSection.tsx",
          "src/components/landing/Navbar.tsx",
          "src/pages/Dashboard.tsx",
          "src/pages/ManagerPlanningPage.tsx",
          "src/pages/ManagerReportsPage.tsx",
          "src/pages/auth/AuthCallbackPage.tsx",
          "src/pages/auth/ResetPasswordPage.tsx",
          "src/components/admin/UserCreateModal.tsx",
          "src/hooks/useAgentTours.tsx",
          "src/hooks/usePlanningRealtimeSocket.tsx",
          "src/hooks/usePlanningRealtimeStream.tsx",
          "src/hooks/useTickets.tsx",
          "src/lib/apiBase.ts",
          "src/utils/authz.ts",
          "src/utils/errorHandlers.tsx",
          "src/lib/scrollPageToTop.ts",
          "src/state/AppStateProvider.tsx",
          "src/state/invalidation.ts",
          "src/state/planningDraft.ts",
          "src/state/queryKeys.ts",
        ],
        thresholds: {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80,
        },
      },
    },
  };
});
