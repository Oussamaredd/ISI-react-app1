import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE || "/";

  return {
    base,
    plugins: [react()],
    root: ".",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
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
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html", "lcov"],
        exclude: ["src/tests/**", "**/*.d.ts", "**/node_modules/**", "**/*.config.*"],
        include: ["src/**/*.{ts,tsx}"],
      },
    },
  };
});
