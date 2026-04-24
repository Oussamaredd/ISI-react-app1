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

// Keep this file list aligned with app/vite.config.js.
const appUiTestFiles = [
  "src/tests/AdminTicketManagement.test.tsx",
  "src/tests/AdvancedTicketList.test.tsx",
  "src/tests/AgentTourPage.test.tsx",
  "src/tests/App.integration.test.tsx",
  "src/tests/App.test.tsx",
  "src/tests/AppHomePage.test.tsx",
  "src/tests/AuditLogs.test.tsx",
  "src/tests/AuthCallbackPage.test.tsx",
  "src/tests/CitizenChallengesPage.test.tsx",
  "src/tests/CitizenProfilePage.test.tsx",
  "src/tests/CitizenReportPage.test.tsx",
  "src/tests/Components.test.tsx",
  "src/tests/CreateTicket.test.tsx",
  "src/tests/Dashboard.realtimeTransport.test.tsx",
  "src/tests/Dashboard.test.tsx",
  "src/tests/errorHandling.test.tsx",
  "src/tests/HeroSection.test.tsx",
  "src/tests/LandingBranding.test.tsx",
  "src/tests/LoginPage.test.tsx",
  "src/tests/ManagerPlanningPage.test.tsx",
  "src/tests/ManagerReportsPage.test.tsx",
  "src/tests/ManagerToursPage.test.tsx",
  "src/tests/registerMapServiceWorker.test.tsx",
  "src/tests/ResetPasswordPage.test.tsx",
  "src/tests/Routing.test.tsx",
  "src/tests/scrollPageToTop.test.ts",
  "src/tests/SettingsPage.test.tsx",
  "src/tests/SystemSettings.test.tsx",
  "src/tests/TicketDetails.test.tsx",
  "src/tests/TicketList.test.tsx",
  "src/tests/TicketsContext.test.tsx",
  "src/tests/UserCreateModal.test.tsx",
  "src/tests/useAgentTours.test.tsx",
  "src/tests/useApiReady.test.tsx",
  "src/tests/usePlanningRealtimeSocket.test.tsx",
  "src/tests/usePlanningRealtimeStream.test.tsx",
];
const appIsolatedTestFiles = [
  "src/tests/useAuth.localStorage.test.tsx",
  "src/tests/useDashboard.test.tsx",
  "src/tests/useTickets.test.tsx",
];
const appE2eTestFile = "src/tests/e2e.key-journeys.test.tsx";

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
    return appUiTestFiles;
  }

  if (suite === "isolated") {
    return appIsolatedTestFiles;
  }

  if (suite !== "fast") {
    return [];
  }

  const excluded = new Set([
    ...appUiTestFiles,
    ...appIsolatedTestFiles,
    ...(process.env.ECOTRACK_INCLUDE_APP_E2E === "1" ? [] : [appE2eTestFile]),
  ]);

  return readTestFiles(path.resolve(workspaceDir, "src/tests")).filter((filePath) => !excluded.has(filePath));
};

const isRetriableVitestWorkerError = (error) => {
  const details = [error?.message, error?.stderr?.toString?.(), error?.stdout?.toString?.()]
    .filter(Boolean)
    .join("\n");

  return (
    details.includes("Failed to start forks worker") ||
    details.includes("Timeout waiting for worker to respond") ||
    details.includes("Command failed:")
  );
};

const runBatch = (batchFiles) => {
  const env = { ...process.env };
  env.ECOTRACK_APP_TEST_SUITE = suite;
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      execFileSync(process.execPath, [runVitestScript, ...forwardedArgs, ...batchFiles], {
        cwd: workspaceDir,
        stdio: "inherit",
        env,
      });
      return;
    } catch (error) {
      if (attempt >= maxAttempts || !isRetriableVitestWorkerError(error)) {
        throw error;
      }

      console.warn(
        `[ecotrack-app:test] retrying ${batchFiles.join(", ")} after worker startup timeout`,
      );
    }
  }
};

if (includesRunFlag && (suite === "fast" || suite === "isolated" || suite === "ui")) {
  const suiteFiles = resolveSuiteFiles();
  if (suiteFiles.length === 0) {
    process.exit(0);
  }

  const batchSize = suite === "isolated" ? suiteFiles.length : 1;
  for (let index = 0; index < suiteFiles.length; index += batchSize) {
    runBatch(suiteFiles.slice(index, index + batchSize));
  }
  process.exit(0);
}

process.env.ECOTRACK_APP_TEST_SUITE = suite;
process.argv = [process.argv[0], process.argv[1], ...forwardedArgs];

await import("./run-vitest.mjs");
