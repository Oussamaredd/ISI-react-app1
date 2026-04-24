import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(currentDir, "..");
const forwardedArgs = process.argv.slice(2);
const tsBuildInfoFlagIndex = forwardedArgs.indexOf("--tsBuildInfoFile");
const configuredBuildInfoFile =
  process.env.ECOTRACK_TSC_APP_BUILD_INFO?.trim() ||
  (tsBuildInfoFlagIndex >= 0 ? forwardedArgs[tsBuildInfoFlagIndex + 1] : "../tmp/tsc/app.tsbuildinfo");

const tscEntrypoints = [
  path.resolve(currentDir, "../node_modules/typescript/bin/tsc"),
  path.resolve(currentDir, "../../node_modules/typescript/bin/tsc"),
];

const tscEntrypoint = tscEntrypoints.find((candidate) => fs.existsSync(candidate));

if (!tscEntrypoint) {
  throw new Error("Unable to locate TypeScript CLI entrypoint in app or root node_modules.");
}

const isWritablePath = (targetPath) => {
  const resolvedPath = path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(workspaceDir, targetPath);
  const directoryPath = path.dirname(resolvedPath);
  const probePath = path.join(directoryPath, `.codex-write-probe-${process.pid}`);

  try {
    fs.mkdirSync(directoryPath, { recursive: true });
    fs.writeFileSync(probePath, "ok");
    fs.unlinkSync(probePath);
    return true;
  } catch {
    return false;
  }
};

const fallbackBuildInfoFile = path.join(os.tmpdir(), "ecotrack-tsc", "app.tsbuildinfo");
const resolvedBuildInfoFile = isWritablePath(configuredBuildInfoFile)
  ? configuredBuildInfoFile
  : fallbackBuildInfoFile;

if (resolvedBuildInfoFile !== configuredBuildInfoFile) {
  console.warn(
    `[ecotrack-app:typecheck] tsbuildinfo fallback ${configuredBuildInfoFile} -> ${resolvedBuildInfoFile}`,
  );
}

if (tsBuildInfoFlagIndex >= 0) {
  forwardedArgs[tsBuildInfoFlagIndex + 1] = resolvedBuildInfoFile;
} else {
  forwardedArgs.push("--tsBuildInfoFile", resolvedBuildInfoFile);
}

execFileSync(process.execPath, [tscEntrypoint, ...forwardedArgs], {
  cwd: workspaceDir,
  stdio: "inherit",
  env: process.env,
});
