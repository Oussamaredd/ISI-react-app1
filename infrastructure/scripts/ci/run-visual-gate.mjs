import { spawnSync } from "node:child_process";

const enabled = process.env.ENABLE_VISUAL_GATE === "1";
const percyToken = process.env.PERCY_TOKEN;
const customPercyCommand = process.env.PERCY_COMMAND?.trim();

const shellCommandArgs = (command) =>
  process.platform === "win32"
    ? ["cmd", "/d", "/s", "/c", command]
    : ["sh", "-lc", command];

if (!enabled) {
  console.log("[ci] Visual regression gate is disabled (set ENABLE_VISUAL_GATE=1 to enable).");
  process.exit(0);
}

if (!percyToken) {
  console.log("[ci] Visual regression gate skipped: PERCY_TOKEN is not configured.");
  process.exit(0);
}

let result;

if (!customPercyCommand) {
  console.log("[ci] Running default Percy snapshot flow.");
  result = spawnSync("node", ["infrastructure/scripts/ci/run-visual-snapshots.mjs"], {
    shell: true,
    stdio: "inherit",
    env: process.env,
  });
} else {
  console.log(`[ci] Running visual regression gate with Percy exec (${customPercyCommand}).`);
  result = spawnSync(
    "npx",
    ["-y", "@percy/cli@1.31.2", "exec", "--", ...shellCommandArgs(customPercyCommand)],
    {
      shell: true,
      stdio: "inherit",
      env: process.env,
    },
  );
}

process.exit(result.status ?? 1);
