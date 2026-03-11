import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";

const enabled = process.env.ENABLE_LIGHTHOUSE_GATE === "1";
const previewPort = process.env.LIGHTHOUSE_PREVIEW_PORT || "4173";
const previewBaseUrl = process.env.LIGHTHOUSE_BASE_URL || `http://127.0.0.1:${previewPort}`;

if (!enabled) {
  console.log("[ci] Lighthouse gate is disabled (set ENABLE_LIGHTHOUSE_GATE=1 to enable).");
  process.exit(0);
}

const env = { ...process.env };

await mkdir("tmp/ci/lighthouse", { recursive: true });

const runCommand = (command, args) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      env,
      shell: true,
      stdio: "inherit",
    });

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });

const buildExitCode = await runCommand("npm", ["run", "build", "--workspace=ecotrack-app"]);
if (buildExitCode !== 0) {
  process.exit(buildExitCode);
}

const preview = spawn(
  "npm",
  ["run", "preview", "--workspace=ecotrack-app", "--", "--host", "127.0.0.1", "--port", previewPort],
  {
    env,
    shell: true,
    stdio: "inherit",
  },
);

const cleanup = () => {
  if (!preview.killed) {
    preview.kill("SIGTERM");
  }
};

process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

const waitResult = spawn(
  "node",
  ["infrastructure/scripts/wait-for-api-ready.mjs", "--url", previewBaseUrl],
  {
    env,
    shell: true,
    stdio: "inherit",
  },
);

const waitExitCode = await new Promise((resolve) => {
  waitResult.on("close", resolve);
});

if (waitExitCode !== 0) {
  cleanup();
  process.exit(waitExitCode ?? 1);
}

const lhci = spawn("npx", ["-y", "@lhci/cli@0.15.1", "autorun", "--config=app/lighthouserc.json"], {
  env,
  shell: true,
  stdio: "inherit",
});

const lhciExitCode = await new Promise((resolve) => {
  lhci.on("close", resolve);
});

cleanup();
process.exit(lhciExitCode ?? 1);
