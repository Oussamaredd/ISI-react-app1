import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const spawnRestricted = process.env.ECOTRACK_VITE_SPAWN_RESTRICTED === "1";

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
    createCloudflarePagesRedirectsPlugin({
      edgeProxyEnabled,
      edgeProxyTargetOrigin,
    }),
  ];

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
      sourcemap: sentrySourceMapsEnabled,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (id.includes("react-router")) {
              return "router-vendor";
            }

            if (id.includes("@tanstack/react-query")) {
              return "query-vendor";
            }

            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(currentDir, "./src"),
      },
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
      // Keep test execution stable on constrained Windows runners.
      pool: "threads",
      fileParallelism: false,
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html", "lcov"],
        exclude: ["src/tests/**", "**/*.d.ts", "**/node_modules/**", "**/*.config.*"],
        include: [
          "src/App.tsx",
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
          "src/lib/registerMapServiceWorker.ts",
          "src/utils/authz.ts",
          "src/utils/errorHandlers.tsx",
          "src/lib/scrollPageToTop.ts",
          "src/state/AppStateProvider.tsx",
          "src/state/invalidation.ts",
          "src/state/planningDraft.ts",
          "src/state/queryKeys.ts",
        ],
        thresholds: {
          statements: 60,
          branches: 55,
          functions: 60,
          lines: 60,
        },
      },
    },
  };
});
