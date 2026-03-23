import "../../infrastructure/scripts/node-preload/disable-vite-net-use.cjs";

import fs from "node:fs";
import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const databaseDistEntry = path.resolve(currentDir, "../../database/dist/index.js");

if (!fs.existsSync(databaseDistEntry)) {
  console.error(
    `[api-test-preflight] Missing internal package build artifact: ${databaseDistEntry}`,
  );
  console.error(
    "[api-test-preflight] Run `npm run build --workspace=ecotrack-database` before backend tests.",
  );
  process.exit(1);
}

if (process.env.ECOTRACK_VITE_SPAWN_RESTRICTED === "1") {
  const esbuildFallbackUrl = pathToFileURL(
    path.resolve(currentDir, "../../infrastructure/scripts/node-preload/esbuild-runner-fallback.mjs"),
  ).href;

  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "esbuild") {
        return {
          shortCircuit: true,
          url: esbuildFallbackUrl,
        };
      }

      return nextResolve(specifier, context);
    },
  });
}

const vitestEntrypoints = [
  path.resolve(currentDir, "../node_modules/vitest/vitest.mjs"),
  path.resolve(currentDir, "../../node_modules/vitest/vitest.mjs"),
];

const vitestEntrypoint = vitestEntrypoints.find((candidate) => fs.existsSync(candidate));

if (!vitestEntrypoint) {
  throw new Error("Unable to locate Vitest entrypoint in api or root node_modules.");
}

await import(pathToFileURL(vitestEntrypoint).href);
