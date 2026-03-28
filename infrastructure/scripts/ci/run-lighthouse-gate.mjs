import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { resolveLocalBin, resolveRepoPath } from "../performance/lib/resolve-local-bin.mjs";

const qualityOutputRoot = (() => {
  const configuredRoot = process.env.ECOTRACK_QUALITY_OUTPUT_ROOT?.trim();

  if (configuredRoot) {
    return path.isAbsolute(configuredRoot)
      ? configuredRoot
      : resolveRepoPath(configuredRoot);
  }

  return resolveRepoPath(process.env.CI ? "tmp/ci/quality" : "tmp/quality");
})();
const shouldSkip =
  process.env.ECOTRACK_SKIP_LIGHTHOUSE_GATE === "1" || process.env.ENABLE_LIGHTHOUSE_GATE === "0";
const previewPort = process.env.LIGHTHOUSE_PREVIEW_PORT || "4173";
const previewBaseUrl = process.env.LIGHTHOUSE_BASE_URL || `http://127.0.0.1:${previewPort}`;

if (shouldSkip) {
  console.log("[ci] Lighthouse gate skipped because ECOTRACK_SKIP_LIGHTHOUSE_GATE=1 or ENABLE_LIGHTHOUSE_GATE=0.");
  process.exit(0);
}

const env = {
  ...process.env,
  ECOTRACK_QUALITY_OUTPUT_ROOT: qualityOutputRoot,
};

await mkdir(path.join(qualityOutputRoot, "lighthouse"), { recursive: true });

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

const lhci = spawn(resolveLocalBin("lhci"), ["autorun", "--config=app/lighthouserc.cjs"], {
  env,
  shell: process.platform === "win32",
  stdio: "inherit",
});

const lhciExitCode = await new Promise((resolve) => {
  lhci.on("close", resolve);
});

cleanup();
process.exit(lhciExitCode ?? 1);
