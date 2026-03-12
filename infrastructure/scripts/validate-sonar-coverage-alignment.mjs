import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT_DIR = process.cwd();
const APP_DIR = path.join(ROOT_DIR, 'app');
const API_DIR = path.join(ROOT_DIR, 'api');
const COVERABLE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function runGitCommand(args) {
  try {
    return execFileSync('git', args, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EPERM') {
      try {
        return execFileSync('git', args, {
          cwd: ROOT_DIR,
          encoding: 'utf8',
          shell: true,
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
      } catch {
        return '';
      }
    }

    return '';
  }
}

function addGitOutputToSet(set, output) {
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) {
      set.add(normalizePath(trimmed));
    }
  }
}

function gitRefExists(ref) {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], {
      cwd: ROOT_DIR,
      stdio: 'ignore',
    });
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EPERM') {
      try {
        execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], {
          cwd: ROOT_DIR,
          shell: true,
          stdio: 'ignore',
        });
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }
}

function readGitHubEventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  } catch {
    return null;
  }
}

function resolveComparisonBase() {
  const explicitBase = process.env.SONAR_COVERAGE_BASE_SHA?.trim();
  if (explicitBase && gitRefExists(explicitBase)) {
    return {
      diffRange: `${explicitBase}...HEAD`,
      label: `explicit base ${explicitBase.slice(0, 12)}`,
    };
  }

  const githubEvent = readGitHubEventPayload();
  const pullRequestBase = githubEvent?.pull_request?.base?.sha?.trim();
  if (pullRequestBase && gitRefExists(pullRequestBase)) {
    return {
      diffRange: `${pullRequestBase}...HEAD`,
      label: `pull request base ${pullRequestBase.slice(0, 12)}`,
    };
  }

  const pushBefore = githubEvent?.before?.trim();
  if (pushBefore && pushBefore !== '0000000000000000000000000000000000000000' && gitRefExists(pushBefore)) {
    return {
      diffRange: `${pushBefore}..HEAD`,
      label: `push base ${pushBefore.slice(0, 12)}`,
    };
  }

  const branchHints = [
    process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null,
    process.env.GITHUB_BASE_REF ?? null,
    'origin/main',
    'main',
    'origin/master',
    'master',
  ].filter(Boolean);

  for (const branchHint of branchHints) {
    if (!gitRefExists(branchHint)) {
      continue;
    }

    const mergeBase = runGitCommand(['merge-base', 'HEAD', branchHint]);
    if (mergeBase && gitRefExists(mergeBase)) {
      return {
        diffRange: `${mergeBase}...HEAD`,
        label: `merge-base with ${branchHint} (${mergeBase.slice(0, 12)})`,
      };
    }
  }

  return null;
}

function collectChangedFiles() {
  const changed = new Set();
  const comparisonBase = resolveComparisonBase();

  if (comparisonBase) {
    addGitOutputToSet(
      changed,
      runGitCommand(['diff', '--name-only', '--diff-filter=ACMRTUXB', comparisonBase.diffRange]),
    );
  } else {
    addGitOutputToSet(changed, runGitCommand(['show', '--name-only', '--pretty=format:', 'HEAD']));
  }

  addGitOutputToSet(changed, runGitCommand(['diff', '--name-only', '--diff-filter=ACMRTUXB']));
  addGitOutputToSet(changed, runGitCommand(['diff', '--cached', '--name-only', '--diff-filter=ACMRTUXB']));
  addGitOutputToSet(changed, runGitCommand(['ls-files', '--others', '--exclude-standard']));
  return {
    comparisonBase,
    files: [...changed].sort(),
  };
}

function parseProperties(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const properties = new Map();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    properties.set(key, value);
  }

  return properties;
}

function splitCsv(value) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function globToRegExp(pattern) {
  let regex = '^';

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];

    if (char === '*') {
      const nextChar = pattern[index + 1];
      if (nextChar === '*') {
        regex += '.*';
        index += 1;
      } else {
        regex += '[^/]*';
      }
      continue;
    }

    if (char === '?') {
      regex += '[^/]';
      continue;
    }

    regex += escapeRegex(char);
  }

  regex += '$';
  return new RegExp(regex);
}

function matchesAnyPattern(filePath, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(filePath));
}

function isRelevantSourceFile(filePath) {
  if (!filePath.startsWith('app/src/') && !filePath.startsWith('api/src/')) {
    return false;
  }

  if (filePath.includes('/tests/') || filePath.endsWith('.d.ts')) {
    return false;
  }

  return COVERABLE_EXTENSIONS.has(path.extname(filePath));
}

function fileExists(repoRelativePath) {
  return fs.existsSync(path.join(ROOT_DIR, repoRelativePath));
}

async function loadCoverageIncludePatterns() {
  const appModule = await import(`${pathToFileURL(path.join(APP_DIR, 'vite.config.js')).href}?t=${Date.now()}`);
  const apiModule = await import(`${pathToFileURL(path.join(API_DIR, 'vitest.config.ts')).href}?t=${Date.now()}`);

  const appFactory = appModule.default;
  const appConfig = typeof appFactory === 'function'
    ? await appFactory({ command: 'serve', mode: 'test', isPreview: false, isSsrBuild: false })
    : appFactory;
  const apiConfig = apiModule.default;

  const appIncludes = (appConfig?.test?.coverage?.include ?? []).map((pattern) =>
    normalizePath(path.posix.join('app', pattern.replace(/^\.\//, ''))),
  );
  const apiIncludes = (apiConfig?.test?.coverage?.include ?? []).map((pattern) =>
    normalizePath(path.posix.join('api', pattern.replace(/^\.\//, ''))),
  );

  return [...appIncludes, ...apiIncludes];
}

function formatList(values) {
  return values.map((value) => `- ${value}`).join('\n');
}

async function main() {
  const sonarProperties = parseProperties(path.join(ROOT_DIR, 'sonar-project.properties'));
  const sonarCoverageExclusions = splitCsv(sonarProperties.get('sonar.coverage.exclusions'));
  const sonarSourceExclusions = splitCsv(sonarProperties.get('sonar.exclusions'));
  const coverageIncludePatterns = await loadCoverageIncludePatterns();
  const { comparisonBase, files } = collectChangedFiles();
  const changedFiles = files.filter(isRelevantSourceFile);

  const missingAlignment = [];
  const conflictingAlignment = [];

  for (const filePath of changedFiles) {
    const isCoverageInstrumented = matchesAnyPattern(filePath, coverageIncludePatterns);
    const isSonarExcluded =
      matchesAnyPattern(filePath, sonarCoverageExclusions) ||
      matchesAnyPattern(filePath, sonarSourceExclusions);

    if (!isCoverageInstrumented && !isSonarExcluded) {
      missingAlignment.push(filePath);
    }

    if (isCoverageInstrumented && isSonarExcluded) {
      conflictingAlignment.push(filePath);
    }
  }

  const invalidCoverageIncludes = coverageIncludePatterns.filter(
    (pattern) => !/[?*]/.test(pattern) && !fileExists(pattern),
  );
  const configuredCoverageConflicts = coverageIncludePatterns.filter(
    (pattern) =>
      !/[?*]/.test(pattern) &&
      fileExists(pattern) &&
      (matchesAnyPattern(pattern, sonarCoverageExclusions) || matchesAnyPattern(pattern, sonarSourceExclusions)),
  );
  const staleCoverageExclusions = sonarCoverageExclusions.filter(
    (pattern) =>
      !/[?*]/.test(pattern) &&
      (pattern.startsWith('app/src/') || pattern.startsWith('api/src/')) &&
      !fileExists(pattern),
  );

  const problems = [];

  if (missingAlignment.length > 0) {
    problems.push(
      [
        'Changed source files are outside both Vitest coverage instrumentation and Sonar coverage exclusions.',
        'Add tests by expanding the workspace coverage include list, or explicitly exclude the file in sonar.coverage.exclusions.',
        formatList(missingAlignment),
      ].join('\n'),
    );
  }

  if (conflictingAlignment.length > 0) {
    problems.push(
      [
        'Changed source files are both instrumented for coverage and excluded from Sonar coverage.',
        'Keep each file in exactly one lane so local coverage and Sonar new-code coverage stay aligned.',
        formatList(conflictingAlignment),
      ].join('\n'),
    );
  }

  if (invalidCoverageIncludes.length > 0) {
    problems.push(
      [
        'Coverage include entries reference files that do not exist.',
        formatList(invalidCoverageIncludes),
      ].join('\n'),
    );
  }

  if (staleCoverageExclusions.length > 0) {
    problems.push(
      [
        'Sonar coverage exclusions reference files that do not exist.',
        formatList(staleCoverageExclusions),
      ].join('\n'),
    );
  }

  if (configuredCoverageConflicts.length > 0) {
    problems.push(
      [
        'Configured workspace coverage include entries are also excluded from Sonar coverage.',
        'Remove the overlap so the same source file is not simultaneously required and ignored.',
        formatList(configuredCoverageConflicts),
      ].join('\n'),
    );
  }

  if (problems.length > 0) {
    console.error('[validate-sonar-coverage] FAIL');
    console.error(problems.join('\n\n'));
    process.exit(1);
  }

  const baseLabel = comparisonBase?.label ?? 'HEAD only (fallback)';
  console.log(
    `[validate-sonar-coverage] PASS (${changedFiles.length} changed app/api source file(s) checked against Vitest coverage scope and Sonar coverage exclusions; base=${baseLabel})`,
  );
}

await main();
