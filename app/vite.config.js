import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const spawnRestricted = process.env.ECOTRACK_VITE_SPAWN_RESTRICTED === "1";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE || "/";

  return {
    base,
    plugins: [react()],
    root: ".",
    optimizeDeps: spawnRestricted
      ? {
          noDiscovery: true,
          include: [],
        }
      : undefined,
    build: spawnRestricted
      ? {
          minify: false,
        }
      : undefined,
    resolve: {
      alias: {
        "@": path.resolve(currentDir, "./src"),
      },
    },
    server: {
      port: 5173,
      open: true,
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
          "src/pages/CitizenReportPage.tsx",
          "src/pages/AgentTourPage.tsx",
          "src/pages/ManagerPlanningPage.tsx",
          "src/utils/authz.ts",
          "src/lib/scrollPageToTop.ts",
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
