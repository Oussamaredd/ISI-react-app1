import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDirectory, "src"),
      "@api": path.resolve(rootDirectory, "src/api")
    }
  },
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    pool: "threads",
    fileParallelism: false,
    maxWorkers: 1
  }
});
