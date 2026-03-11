import { spawn } from "node:child_process";

const previewPort = process.env.PERCY_PREVIEW_PORT || "4173";
const previewBaseUrl = process.env.PERCY_BASE_URL || `http://127.0.0.1:${previewPort}`;
const previewUrls = (process.env.PERCY_URLS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const snapshotUrls =
  previewUrls.length > 0
    ? previewUrls
    : [
        `${previewBaseUrl}/`,
        `${previewBaseUrl}/login`,
        `${previewBaseUrl}/app/dashboard`,
        `${previewBaseUrl}/app/agent/tour`,
      ];

const runCommand = (command, args) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      env: process.env,
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
    env: process.env,
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

const waitForPreview = await new Promise((resolve) => {
  const child = spawn(
    "node",
    ["infrastructure/scripts/wait-for-api-ready.mjs", "--url", previewBaseUrl],
    {
      env: process.env,
      shell: true,
      stdio: "inherit",
    },
  );

  child.on("close", (code) => {
    resolve(code ?? 1);
  });
});

if (waitForPreview !== 0) {
  cleanup();
  process.exit(waitForPreview);
}

const snapshotExitCode = await new Promise((resolve) => {
  const child = spawn(
    "npx",
    ["-y", "@percy/cli@1.31.2", "snapshot", ...snapshotUrls],
    {
      env: process.env,
      shell: true,
      stdio: "inherit",
    },
  );

  child.on("close", (code) => {
    resolve(code ?? 1);
  });
});

cleanup();
process.exit(snapshotExitCode);
