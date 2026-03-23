import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const rootManifestPath = path.join(repoRoot, "package.json");
const rootLockfilePath = path.join(repoRoot, "package-lock.json");

const fail = (message) => {
  console.error(`[validate-workspace-toolchain] ${message}`);
  process.exit(1);
};

const workspaces = [
  {
    name: "root",
    manifestPath: rootManifestPath,
    packages: ["concurrently"],
  },
  {
    name: "app",
    manifestPath: path.join(repoRoot, "app", "package.json"),
    packages: ["typescript", "vite", "vitest", "eslint", "@eslint/js", "leaflet", "lucide-react"],
  },
  {
    name: "mobile",
    manifestPath: path.join(repoRoot, "mobile", "package.json"),
    packages: ["typescript", "vitest", "eslint", "expo"],
  },
  {
    name: "api",
    manifestPath: path.join(repoRoot, "api", "package.json"),
    packages: ["typescript", "vitest", "eslint", "@eslint/js", "cross-env", "express"],
  },
  {
    name: "database",
    manifestPath: path.join(repoRoot, "database", "package.json"),
    packages: ["typescript", "drizzle-kit", "@types/node"],
  },
];

const unsupportedWorkspaceLockfiles = [
  path.join(repoRoot, "app", "package-lock.json"),
  path.join(repoRoot, "mobile", "package-lock.json"),
  path.join(repoRoot, "api", "package-lock.json"),
  path.join(repoRoot, "database", "package-lock.json"),
  path.join(repoRoot, "infrastructure", "package-lock.json"),
];

const resolvePackage = (requireFromManifest, packageName) => {
  const candidateSpecifiers = [`${packageName}/package.json`, packageName];

  for (const specifier of candidateSpecifiers) {
    try {
      return requireFromManifest.resolve(specifier);
    } catch {
      // Keep trying the next resolution target.
    }
  }

  return null;
};

const main = () => {
  if (!fs.existsSync(rootLockfilePath)) {
    fail("Missing root package-lock.json. Root workspace installs require the committed lockfile.");
  }

  const strayLockfiles = unsupportedWorkspaceLockfiles.filter((lockfilePath) => fs.existsSync(lockfilePath));
  if (strayLockfiles.length > 0) {
    const relativePaths = strayLockfiles
      .map((lockfilePath) => path.relative(repoRoot, lockfilePath))
      .join(", ");

    fail(`Unsupported workspace package-lock.json files found: ${relativePaths}. Use a single root install only.`);
  }

  const missingPackages = [];

  for (const workspace of workspaces) {
    const requireFromManifest = createRequire(workspace.manifestPath);

    for (const packageName of workspace.packages) {
      const resolvedPath = resolvePackage(requireFromManifest, packageName);
      if (!resolvedPath) {
        missingPackages.push(`${workspace.name}:${packageName}`);
      }
    }
  }

  if (missingPackages.length > 0) {
    fail(
      `Missing required workspace packages: ${missingPackages.join(
        ", ",
      )}. Reinstall from the repo root with \`npm ci --include=dev\`.`,
    );
  }

  console.log(
    "[validate-workspace-toolchain] Root lockfile and workspace toolchain packages are present; use repo-root installs only.",
  );
};

main();
