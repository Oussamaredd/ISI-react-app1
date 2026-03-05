import { spawnSync } from "node:child_process";

const enabled = process.env.ENABLE_VISUAL_GATE === "1";
const percyToken = process.env.PERCY_TOKEN;

if (!enabled) {
  console.log("[ci] Visual regression gate is disabled (set ENABLE_VISUAL_GATE=1 to enable).");
  process.exit(0);
}

if (!percyToken) {
  console.log("[ci] Visual regression gate skipped: PERCY_TOKEN is not configured.");
  process.exit(0);
}

const percyCommand = process.env.PERCY_COMMAND;
if (!percyCommand) {
  console.log("[ci] Visual regression gate skipped: PERCY_COMMAND is not configured.");
  process.exit(0);
}

console.log("[ci] Running visual regression gate with Percy.");
const result = spawnSync("npx", ["-y", "@percy/cli@1.31.2", "exec", "--", "bash", "-lc", percyCommand], {
  shell: true,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
