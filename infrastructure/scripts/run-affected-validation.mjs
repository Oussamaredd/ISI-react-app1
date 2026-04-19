import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");

const args = process.argv.slice(2);
let baseRef = null;

for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];

  if (argument === "--base") {
    baseRef = args[index + 1] ?? null;
    index += 1;
  }
}

const commandGroupsByWorkspace = {
  database: [
    ["npm", ["run", "build:database"]],
    ["npm", ["run", "typecheck:database"]],
    ["npm", ["run", "db:migrate"]],
  ],
  api: [
    ["npm", ["run", "lint:api"]],
    ["npm", ["run", "typecheck:api"]],
    ["npm", ["run", "test:api"]],
  ],
  app: [
    ["npm", ["run", "lint:app"]],
    ["npm", ["run", "typecheck:app"]],
    ["npm", ["run", "test:app"]],
  ],
  mobile: [
    ["npm", ["run", "lint:mobile"]],
    ["npm", ["run", "typecheck:mobile"]],
    ["npm", ["run", "test:mobile"]],
  ],
};

const workspaceOrder = ["database", "api", "app", "mobile"];

const runCommand = (command, commandArgs) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command} ${commandArgs.join(" ")}`));
    });

    child.on("error", reject);
  });

const runGit = (gitArgs) =>
  execFileSync("git", gitArgs, {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const normalizePath = (relativePath) => relativePath.split(path.sep).join("/");

const collectChangedPaths = () => {
  if (baseRef) {
    return new Set(runGit(["diff", "--name-only", "--diff-filter=ACMR", `${baseRef}...HEAD`]).map(normalizePath));
  }

  return new Set(
    [
      ...runGit(["diff", "--name-only", "--diff-filter=ACMR", "HEAD"]),
      ...runGit(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]),
      ...runGit(["ls-files", "--others", "--exclude-standard"]),
    ].map(normalizePath),
  );
};

const isEnvironmentFile = (relativePath) =>
  /(^|\/)\.env(\.[^/]+)?$/.test(relativePath) || relativePath.includes(".env.");

const changedPaths = [...collectChangedPaths()].sort();

if (changedPaths.length === 0) {
  console.log("[validate:affected] No modified tracked or untracked files were found.");
  process.exit(0);
}

const affectedWorkspaces = new Set();
let docsTouched = false;
let fullValidationRequired = false;

for (const relativePath of changedPaths) {
  if (relativePath.startsWith("app/")) {
    affectedWorkspaces.add("app");
    continue;
  }

  if (relativePath.startsWith("mobile/")) {
    affectedWorkspaces.add("mobile");
    continue;
  }

  if (relativePath.startsWith("api/")) {
    affectedWorkspaces.add("api");
    continue;
  }

  if (relativePath.startsWith("database/")) {
    affectedWorkspaces.add("database");
    continue;
  }

  if (
    relativePath.startsWith("docs/") ||
    relativePath === "README.md" ||
    relativePath === "CHANGELOG.md"
  ) {
    docsTouched = true;
    continue;
  }

  if (
    relativePath.startsWith("infrastructure/") ||
    relativePath.startsWith(".github/") ||
    isEnvironmentFile(relativePath)
  ) {
    fullValidationRequired = true;
    continue;
  }

  fullValidationRequired = true;
}

console.log("[validate:affected] Changed paths:");
for (const relativePath of changedPaths) {
  console.log(`- ${relativePath}`);
}

if (fullValidationRequired) {
  console.log("[validate:affected] Cross-layer/env/CI changes detected; running the full validation suite.");
  await runCommand("npm", ["run", "validate:full"]);
  process.exit(0);
}

await runCommand("npm", ["run", "validate:workspace-toolchain"]);

for (const workspace of workspaceOrder) {
  if (!affectedWorkspaces.has(workspace)) {
    continue;
  }

  console.log(`[validate:affected] Running ${workspace} validation set.`);
  for (const [command, commandArgs] of commandGroupsByWorkspace[workspace]) {
    await runCommand(command, commandArgs);
  }
}

if (docsTouched || affectedWorkspaces.size > 0) {
  await runCommand("npm", ["run", "validate-doc-sync"]);
}
