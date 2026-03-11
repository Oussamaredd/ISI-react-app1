import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const profileIndex = process.argv.indexOf("--profile");
const selectedProfile =
  (profileIndex >= 0 ? process.argv[profileIndex + 1] : undefined) ||
  process.env.K6_PROFILE ||
  "smoke";

const scenariosByProfile = {
  smoke: ["api-health-smoke.js"],
  auth: ["api-business-flow.js"],
  ramping: ["api-health-ramping.js"],
  spike: ["api-health-spike.js"],
  stress: ["api-health-stress.js"],
  soak: ["api-health-soak.js"],
  all: [
    "api-health-smoke.js",
    "api-business-flow.js",
    "api-health-ramping.js",
    "api-health-spike.js",
    "api-health-stress.js",
    "api-health-soak.js",
  ],
};

const scenarioNames = scenariosByProfile[selectedProfile];
if (!scenarioNames) {
  console.error(
    `[ci] Unknown K6 profile '${selectedProfile}'. Expected one of: ${Object.keys(
      scenariosByProfile,
    ).join(", ")}`,
  );
  process.exit(1);
}

await mkdir("tmp/ci/k6", { recursive: true });

const runScenario = (scenarioName) =>
  new Promise((resolve) => {
    const summaryPath = path.join("tmp/ci/k6", `${scenarioName.replace(/\.js$/, "")}.summary.json`);
    const scenarioPath = path.join("infrastructure/performance/k6", scenarioName);
    console.log(`[ci] Running K6 scenario ${scenarioName}`);

    const child = spawn(
      "k6",
      ["run", "--summary-export", summaryPath, scenarioPath],
      {
        stdio: "inherit",
        shell: true,
        env: process.env,
      },
    );

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });

let highestExitCode = 0;
for (const scenarioName of scenarioNames) {
  const exitCode = await runScenario(scenarioName);
  if (exitCode !== 0) {
    highestExitCode = exitCode;
  }
}

process.exit(highestExitCode);
