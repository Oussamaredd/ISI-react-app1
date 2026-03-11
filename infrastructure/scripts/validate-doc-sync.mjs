import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ZERO_SHA = '0000000000000000000000000000000000000000';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const gitCommand =
  process.env.GIT_BIN ||
  (process.platform === 'win32' && fs.existsSync('C:/Program Files/Git/cmd/git.exe')
    ? 'C:/Program Files/Git/cmd/git.exe'
    : 'git');

process.chdir(repoRoot);

const args = process.argv.slice(2);

const hasFlag = (flagName) => args.includes(flagName);
const getFlagValue = (flagName) => {
  const index = args.indexOf(flagName);
  return index === -1 ? undefined : args[index + 1];
};

const git = (gitArgs, options = {}) => {
  const result = spawnSync(gitCommand, gitArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || `git ${gitArgs.join(' ')} failed`).trim();
    throw new Error(message);
  }

  return (result.stdout || '').trim();
};

const normalizePath = (value) => value.replace(/\\/g, '/');
const uniqueSorted = (values) => [...new Set(values)].sort((left, right) => left.localeCompare(right));

const getChangedFilesFromDiff = (rangeArgs) =>
  uniqueSorted(
    git(['diff', '--name-only', '--diff-filter=ACMRD', ...rangeArgs])
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(normalizePath),
  );

const getUntrackedFiles = () =>
  uniqueSorted(
    git(['ls-files', '--others', '--exclude-standard'])
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(normalizePath),
  );

const getChangedFiles = () => {
  const baseRef = getFlagValue('--base');
  const explicitFiles = getFlagValue('--files');

  if (explicitFiles) {
    return uniqueSorted(
      explicitFiles
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map(normalizePath),
    );
  }

  if (hasFlag('--staged')) {
    return getChangedFilesFromDiff(['--cached']);
  }

  if (baseRef && baseRef !== ZERO_SHA) {
    return getChangedFilesFromDiff([`${baseRef}...HEAD`]);
  }

  return uniqueSorted([...getChangedFilesFromDiff(['HEAD']), ...getUntrackedFiles()]);
};

const readFileAtRef = (refSpec, relativePath) => {
  const objectSpec = refSpec ? `${refSpec}:${relativePath}` : `:${relativePath}`;

  try {
    return git(['show', objectSpec]);
  } catch {
    return undefined;
  }
};

const readVersionFromPackageJson = (jsonSource) => {
  if (!jsonSource) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(jsonSource);
    return typeof parsed.version === 'string' ? parsed.version : undefined;
  } catch {
    return undefined;
  }
};

const getRootVersionPair = () => {
  const relativePath = 'package.json';
  const baseRef = getFlagValue('--base');
  const explicitBefore = getFlagValue('--previous-version');
  const explicitAfter = getFlagValue('--next-version');

  if (explicitBefore !== undefined || explicitAfter !== undefined) {
    return {
      before: explicitBefore,
      after: explicitAfter,
    };
  }

  if (hasFlag('--staged')) {
    return {
      before: readVersionFromPackageJson(readFileAtRef('HEAD', relativePath)),
      after: readVersionFromPackageJson(readFileAtRef('', relativePath)),
    };
  }

  if (baseRef && baseRef !== ZERO_SHA) {
    return {
      before: readVersionFromPackageJson(readFileAtRef(baseRef, relativePath)),
      after: readVersionFromPackageJson(readFileAtRef('HEAD', relativePath)),
    };
  }

  const currentPath = path.join(repoRoot, relativePath);
  const currentSource = fs.existsSync(currentPath) ? fs.readFileSync(currentPath, 'utf8') : undefined;

  return {
    before: readVersionFromPackageJson(readFileAtRef('HEAD', relativePath)),
    after: readVersionFromPackageJson(currentSource),
  };
};

const pathStartsWith = (file, prefix) => file === prefix || file.startsWith(`${prefix}/`);
const isDocsFile = (file) => file === 'CHANGELOG.md' || pathStartsWith(file, 'docs');
const isTestFile = (file) =>
  /(^|\/)(tests?|__tests__)\//.test(file) || /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file);

const changedFiles = getChangedFiles();

if (changedFiles.length === 0) {
  console.log('validate-doc-sync: no changed files detected; skipping.');
  process.exit(0);
}

const hasDocChange = (matcher) => changedFiles.some((file) => isDocsFile(file) && matcher(file));

const rules = [
  {
    id: 'frontend-routes',
    description: 'Frontend route or page behavior changes must update route or feature docs.',
    matchFile: (file) =>
      !isTestFile(file) &&
      (pathStartsWith(file, 'app/src/routes') ||
        pathStartsWith(file, 'app/src/layouts') ||
        pathStartsWith(file, 'app/src/pages') ||
        file === 'app/src/main.tsx' ||
        file === 'app/nginx.conf'),
    docMatcher: (file) =>
      file === 'docs/FRONTEND_ROUTES.md' ||
      pathStartsWith(file, 'docs/features') ||
      file === 'docs/ARCHITECTURE_OVERVIEW.md' ||
      file === 'README.md',
    acceptedDocs:
      'docs/FRONTEND_ROUTES.md, docs/features/**, docs/ARCHITECTURE_OVERVIEW.md, README.md',
  },
  {
    id: 'api-contract',
    description: 'API controllers, DTOs, and published contracts must update API-facing documentation.',
    matchFile: (file) =>
      !isTestFile(file) &&
      (/^api\/src\/modules\/.+controller\.ts$/.test(file) ||
        /^api\/src\/modules\/.+contract\.ts$/.test(file) ||
        /^api\/src\/modules\/.+\/dto\/.+\.ts$/.test(file)),
    docMatcher: (file) =>
      file === 'docs/API_DOCUMENTATION.md' ||
      pathStartsWith(file, 'docs/openapi') ||
      pathStartsWith(file, 'docs/features') ||
      file === 'README.md',
    acceptedDocs: 'docs/API_DOCUMENTATION.md, docs/openapi/**, docs/features/**, README.md',
  },
  {
    id: 'database-shape',
    description: 'Database schema, migrations, and seed changes must update schema or contract documentation.',
    matchFile: (file) =>
      pathStartsWith(file, 'database/schema') ||
      pathStartsWith(file, 'database/migrations') ||
      pathStartsWith(file, 'database/seeds'),
    docMatcher: (file) =>
      file === 'docs/DB_SCHEMA_NAMESPACE_PLAN.md' ||
      file === 'docs/DB_SCHEMA_NAMESPACE_STATUS.md' ||
      file === 'docs/API_DOCUMENTATION.md' ||
      file === 'docs/ROADMAP.md',
    acceptedDocs:
      'docs/DB_SCHEMA_NAMESPACE_PLAN.md, docs/DB_SCHEMA_NAMESPACE_STATUS.md, docs/API_DOCUMENTATION.md, docs/ROADMAP.md',
  },
  {
    id: 'env-runtime',
    description: 'Environment, deployment, and runtime command changes must update setup or operations docs.',
    matchFile: (file) =>
      file === '.env.example' ||
      file === 'app/.env.example' ||
      file === 'mobile/.env.example' ||
      file === 'api/.env.example' ||
      pathStartsWith(file, 'infrastructure/environments') ||
      file === 'infrastructure/docker-compose.yml' ||
      /^infrastructure\/scripts\/.+\.(mjs|js|ps1|bat|sh)$/.test(file) ||
      file === 'package.json' ||
      file === 'app/package.json' ||
      file === 'mobile/package.json' ||
      file === 'api/package.json' ||
      file === 'infrastructure/package.json' ||
      pathStartsWith(file, 'api/src/config') ||
      file === 'api/src/main.ts' ||
      file === 'api/src/app.module.ts',
    docMatcher: (file) =>
      file === 'docs/ENV.md' ||
      file === 'docs/ENVIRONMENT_SETUP.md' ||
      file === 'docs/DOCKER_SETUP.md' ||
      file === 'docs/README.md' ||
      pathStartsWith(file, 'docs/runbooks') ||
      file === 'README.md',
    acceptedDocs:
      'docs/ENV.md, docs/ENVIRONMENT_SETUP.md, docs/DOCKER_SETUP.md, docs/README.md, docs/runbooks/**, README.md',
  },
  {
    id: 'workflow-process',
    description: 'Workflow and contributor-process changes must update repository usage or process docs.',
    matchFile: (file) =>
      pathStartsWith(file, '.github/workflows') || file === 'AGENTS.md' || pathStartsWith(file, '.githooks'),
    docMatcher: (file) =>
      file === 'docs/README.md' || file === 'docs/RELEASE_VERSIONING.md' || file === 'README.md',
    acceptedDocs: 'docs/README.md, docs/RELEASE_VERSIONING.md, README.md',
  },
];

const failures = [];
const satisfiedRuleIds = [];

for (const rule of rules) {
  const matchedFiles = changedFiles.filter((file) => rule.matchFile(file));
  if (matchedFiles.length === 0) {
    continue;
  }

  if (!hasDocChange(rule.docMatcher)) {
    failures.push({
      id: rule.id,
      description: rule.description,
      matchedFiles,
      acceptedDocs: rule.acceptedDocs,
    });
    continue;
  }

  satisfiedRuleIds.push(rule.id);
}

const { before: previousRootVersion, after: nextRootVersion } = getRootVersionPair();
const rootVersionChanged =
  typeof nextRootVersion === 'string' &&
  nextRootVersion.length > 0 &&
  previousRootVersion !== nextRootVersion;

if (rootVersionChanged && !changedFiles.includes('CHANGELOG.md')) {
  failures.push({
    id: 'release-version',
    description: `Root package version changed from ${previousRootVersion ?? 'none'} to ${nextRootVersion}, so CHANGELOG.md must be updated in the same change.`,
    matchedFiles: ['package.json'],
    acceptedDocs: 'CHANGELOG.md',
  });
} else if (rootVersionChanged) {
  satisfiedRuleIds.push('release-version');
}

if (failures.length > 0) {
  console.error('validate-doc-sync: documentation updates are missing for the current change set.');

  for (const failure of failures) {
    console.error('');
    console.error(`- Rule: ${failure.id}`);
    console.error(`  ${failure.description}`);
    console.error(`  Triggered by: ${failure.matchedFiles.join(', ')}`);
    console.error(`  Accepted docs: ${failure.acceptedDocs}`);
  }

  process.exit(1);
}

console.log(
  `validate-doc-sync: pass (${changedFiles.length} changed file${changedFiles.length === 1 ? '' : 's'}; ` +
    `${satisfiedRuleIds.length} matching rule${satisfiedRuleIds.length === 1 ? '' : 's'} satisfied).`,
);
