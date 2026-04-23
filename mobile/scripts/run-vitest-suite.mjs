import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(currentDir, "..");
const runVitestScript = path.resolve(currentDir, "./run-vitest.mjs");
const rawArgs = process.argv.slice(2);
const hasExplicitSuite = rawArgs[0] && !rawArgs[0].startsWith("-");
const suite = hasExplicitSuite ? rawArgs[0] : "all";
const forwardedArgs = hasExplicitSuite ? rawArgs.slice(1) : rawArgs;
const includesRunFlag = forwardedArgs.includes("--run");

// Keep this file list aligned with mobile/vitest.config.ts.
const mobileUiTestFiles = [
  "src/tests/AgentHomeScreen.test.tsx",
  "src/tests/LoginScreen.test.tsx",
  "src/tests/ManagerHomeScreen.test.tsx",
  "src/tests/ReactQueryLifecycleProvider.test.tsx",
  "src/tests/ReportScreen.test.tsx",
  "src/tests/SessionProvider.test.tsx",
];

const normalizePathForVitest = (filePath) => filePath.split(path.sep).join("/");

const readTestFiles = (directoryPath) => {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const resolvedPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...readTestFiles(resolvedPath));
      continue;
    }

    if (/\.test\.(ts|tsx)$/.test(entry.name)) {
      files.push(normalizePathForVitest(path.relative(workspaceDir, resolvedPath)));
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
};

const resolveSuiteFiles = () => {
  if (suite === "ui") {
    return mobileUiTestFiles;
  }

  if (suite !== "fast") {
    return [];
  }

  const excluded = new Set(mobileUiTestFiles);
  return readTestFiles(path.resolve(workspaceDir, "src/tests")).filter((filePath) => !excluded.has(filePath));
};

const runBatch = (batchFiles) => {
  const env = { ...process.env };
  delete env.ECOTRACK_MOBILE_TEST_SUITE;

  execFileSync(process.execPath, [runVitestScript, ...forwardedArgs, ...batchFiles], {
    cwd: workspaceDir,
    stdio: "inherit",
    env,
  });
};

if (includesRunFlag && (suite === "fast" || suite === "ui")) {
  const suiteFiles = resolveSuiteFiles();
  if (suiteFiles.length === 0) {
    process.exit(0);
  }

  const batchSize = 1;
  for (let index = 0; index < suiteFiles.length; index += batchSize) {
    runBatch(suiteFiles.slice(index, index + batchSize));
  }
  process.exit(0);
}

process.env.ECOTRACK_MOBILE_TEST_SUITE = suite;
process.argv = [process.argv[0], process.argv[1], ...forwardedArgs];

await import("./run-vitest.mjs");
