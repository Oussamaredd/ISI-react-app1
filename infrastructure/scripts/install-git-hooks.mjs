import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const hooksDir = path.join(repoRoot, '.githooks');
const preCommitHook = path.join(hooksDir, 'pre-commit');
const dotGitPath = path.join(repoRoot, '.git');

const resolveGitDirectory = () => {
  if (!fs.existsSync(dotGitPath)) {
    return null;
  }

  const stats = fs.statSync(dotGitPath);
  if (stats.isDirectory()) {
    return dotGitPath;
  }

  const rawPointer = fs.readFileSync(dotGitPath, 'utf8').trim();
  const match = rawPointer.match(/^gitdir:\s*(.+)$/i);
  if (!match) {
    return null;
  }

  return path.resolve(repoRoot, match[1].trim());
};

const upsertHooksPath = (configSource) => {
  if (/\bhooksPath\s*=/.test(configSource)) {
    return configSource.replace(/(^\s*hooksPath\s*=\s*).+$/m, '$1.githooks');
  }

  if (/\[core\]/.test(configSource)) {
    return configSource.replace(/\[core\]\r?\n/, (match) => `${match}\thooksPath = .githooks\n`);
  }

  const prefix = configSource.endsWith('\n') || configSource.length === 0 ? '' : '\n';
  return `${configSource}${prefix}[core]\n\thooksPath = .githooks\n`;
};

const gitDirectory = resolveGitDirectory();
if (!gitDirectory) {
  console.log('install-git-hooks: skipping because the workspace is not a git worktree.');
  process.exit(0);
}

fs.mkdirSync(hooksDir, { recursive: true });

if (fs.existsSync(preCommitHook)) {
  try {
    fs.chmodSync(preCommitHook, 0o755);
  } catch {
    // Best effort only. Git for Windows can still execute the hook via sh.
  }
}

const gitConfigPath = path.join(gitDirectory, 'config');
const currentConfig = fs.existsSync(gitConfigPath) ? fs.readFileSync(gitConfigPath, 'utf8') : '';
const nextConfig = upsertHooksPath(currentConfig);

if (nextConfig !== currentConfig) {
  fs.writeFileSync(gitConfigPath, nextConfig, 'utf8');
}

console.log('install-git-hooks: configured local git hooks path to .githooks');
