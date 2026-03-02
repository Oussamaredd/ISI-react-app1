import "../../infrastructure/scripts/node-preload/disable-vite-net-use.cjs";

import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

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

await import("../../node_modules/vitest/vitest.mjs");
