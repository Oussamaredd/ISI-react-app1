import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const databaseRoot = path.join(repoRoot, "database");
const databaseDistRoot = path.join(databaseRoot, "dist");

const sourceRoots = [
  path.join(repoRoot, "package-lock.json"),
  path.join(databaseRoot, "package.json"),
  path.join(databaseRoot, "tsconfig.json"),
  path.join(databaseRoot, "drizzle.config.ts"),
  path.join(databaseRoot, "index.ts"),
  path.join(databaseRoot, "client.ts"),
  path.join(databaseRoot, "env.ts"),
  path.join(databaseRoot, "schema"),
  path.join(databaseRoot, "seeds"),
];

const distEntrypoints = [
  path.join(databaseDistRoot, "index.js"),
  path.join(databaseDistRoot, "index.d.ts"),
];

const shouldSkipDirectory = (directoryName) =>
  directoryName === "dist" || directoryName === "node_modules" || directoryName.startsWith(".");

const getLatestMtimeMs = (targetPath) => {
  if (!fs.existsSync(targetPath)) {
    return 0;
  }

  const entry = fs.statSync(targetPath);
  if (!entry.isDirectory()) {
    return entry.mtimeMs;
  }

  let latestMtimeMs = entry.mtimeMs;

  for (const childName of fs.readdirSync(targetPath)) {
    if (shouldSkipDirectory(childName)) {
      continue;
    }

    latestMtimeMs = Math.max(
      latestMtimeMs,
      getLatestMtimeMs(path.join(targetPath, childName)),
    );
  }

  return latestMtimeMs;
};

const runDatabaseBuild = () =>
  new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "build", "--workspace=ecotrack-database"], {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Database build exited with code ${code ?? "unknown"}.`));
    });

    child.on("error", reject);
  });

const sourceMtimeMs = Math.max(...sourceRoots.map((targetPath) => getLatestMtimeMs(targetPath)));
const distMtimeMs = Math.max(...distEntrypoints.map((targetPath) => getLatestMtimeMs(targetPath)));
const hasFreshDist = distEntrypoints.every((targetPath) => fs.existsSync(targetPath)) && distMtimeMs >= sourceMtimeMs;

if (hasFreshDist) {
  console.log("[build-database-if-needed] Reusing current ecotrack-database dist build.");
  process.exit(0);
}

console.log("[build-database-if-needed] Database sources changed or dist artifacts are missing; rebuilding.");
await runDatabaseBuild();
