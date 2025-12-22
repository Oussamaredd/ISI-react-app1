import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const base = process.env.VITE_BASE || "/";

export default defineConfig({
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
    setupFiles: "./src/tests/setup.ts",
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: ["src/tests/**", "**/*.d.ts", "**/node_modules/**", "**/*.config.*"],
      include: ["src/**/*.{ts,tsx}"],
    },
  },
});
