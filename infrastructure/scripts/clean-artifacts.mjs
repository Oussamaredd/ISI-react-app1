import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const isDryRun = process.argv.includes("--dry-run");

const repoEntries = await readdir(repoRoot, { withFileTypes: true });
const cleanupTargets = [
  ...repoEntries
    .filter((entry) => entry.isDirectory() && entry.name === "tmp")
    .map((entry) => path.join(repoRoot, entry.name)),
  ...repoEntries
    .filter((entry) => entry.isDirectory() && /^tmp-ci-logs-/.test(entry.name))
    .map((entry) => path.join(repoRoot, entry.name)),
  ...repoEntries
    .filter((entry) => entry.isFile() && /^temp-.*\.log$/i.test(entry.name))
    .map((entry) => path.join(repoRoot, entry.name)),
];

if (cleanupTargets.length === 0) {
  console.log("[clean-artifacts] No matching temporary artifacts found.");
  process.exit(0);
}

for (const target of cleanupTargets) {
  const relativeTarget = path.relative(repoRoot, target) || ".";

  if (isDryRun) {
    console.log(`[clean-artifacts] Would remove ${relativeTarget}`);
    continue;
  }

  await rm(target, { force: true, recursive: true });
  console.log(`[clean-artifacts] Removed ${relativeTarget}`);
}

if (isDryRun) {
  console.log(
    `[clean-artifacts] Dry run complete. ${cleanupTargets.length} path(s) matched.`,
  );
}
