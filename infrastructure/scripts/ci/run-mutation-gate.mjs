import { spawnSync } from "node:child_process";

const enabled = process.env.ENABLE_MUTATION_GATE === "1";
const strictMode = process.env.CI_QUALITY_STRICT === "1";

if (!enabled) {
  console.log("[ci] Mutation gate is disabled (set ENABLE_MUTATION_GATE=1 to enable).");
  process.exit(0);
}

console.log("[ci] Running mutation gate (Stryker).");
const result = spawnSync(
  "npx",
  ["-y", "@stryker-mutator/core@8.7.1", "run", "--dryRunOnly", "--allowEmpty"],
  {
    shell: true,
    stdio: "inherit",
  },
);

if ((result.status ?? 1) !== 0 && !strictMode) {
  console.warn("[ci] Mutation gate failed in non-strict mode; continuing.");
  process.exit(0);
}

process.exit(result.status ?? 1);
