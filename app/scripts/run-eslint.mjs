import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(currentDir, "..");
const forwardedArgs = process.argv.slice(2);
const cacheLocationFlagIndex = forwardedArgs.indexOf("--cache-location");
const configuredCacheLocation =
  process.env.ECOTRACK_ESLINT_CACHE_APP?.trim() ||
  (cacheLocationFlagIndex >= 0 ? forwardedArgs[cacheLocationFlagIndex + 1] : undefined);

const eslintEntrypoints = [
  path.resolve(currentDir, "../node_modules/eslint/bin/eslint.js"),
  path.resolve(currentDir, "../../node_modules/eslint/bin/eslint.js"),
];

const eslintEntrypoint = eslintEntrypoints.find((candidate) => fs.existsSync(candidate));

if (!eslintEntrypoint) {
  throw new Error("Unable to locate ESLint CLI entrypoint in app or root node_modules.");
}

const isWritablePath = (targetPath) => {
  const resolvedPath = path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(workspaceDir, targetPath);
  const directoryPath = path.dirname(resolvedPath);
  const probePath = path.join(directoryPath, `.codex-write-probe-${process.pid}`);

  try {
    fs.mkdirSync(directoryPath, { recursive: true });
    fs.writeFileSync(probePath, "ok");
    fs.unlinkSync(probePath);
    return true;
  } catch {
    return false;
  }
};

if (configuredCacheLocation) {
  const fallbackCacheLocation = path.join(os.tmpdir(), "ecotrack-eslint", "app");
  const resolvedCacheLocation = isWritablePath(configuredCacheLocation)
    ? configuredCacheLocation
    : fallbackCacheLocation;

  if (resolvedCacheLocation !== configuredCacheLocation) {
    console.warn(
      `[ecotrack-app:lint] cache fallback ${configuredCacheLocation} -> ${resolvedCacheLocation}`,
    );
  }

  if (cacheLocationFlagIndex >= 0) {
    forwardedArgs[cacheLocationFlagIndex + 1] = resolvedCacheLocation;
  } else {
    forwardedArgs.push("--cache-location", resolvedCacheLocation);
  }
}

execFileSync(process.execPath, [eslintEntrypoint, ...forwardedArgs], {
  cwd: workspaceDir,
  stdio: "inherit",
  env: process.env,
});
