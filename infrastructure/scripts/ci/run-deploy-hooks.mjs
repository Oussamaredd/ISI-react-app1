import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const outputDir = path.join(repoRoot, 'tmp', 'ci', 'release');

const trim = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
};

const normalizeMethod = (value) => {
  const normalized = trim(value)?.toUpperCase() ?? 'POST';
  if (normalized !== 'GET' && normalized !== 'POST') {
    throw new Error(`Unsupported deploy-hook method '${normalized}'. Use GET or POST.`);
  }
  return normalized;
};

const readRootPackageVersion = async () => {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const rawPackageJson = await fs.readFile(packageJsonPath, 'utf8');
  const parsedPackageJson = JSON.parse(rawPackageJson);
  return typeof parsedPackageJson.version === 'string' && parsedPackageJson.version.trim()
    ? parsedPackageJson.version.trim()
    : '0.0.0';
};

const releaseTarget = trim(process.env.CD_TARGET_ENV) ?? 'development';
const releaseVersion = await readRootPackageVersion();

const hookDefinitions = [
  {
    name: 'frontend',
    method: normalizeMethod(process.env.CD_FRONTEND_DEPLOY_HOOK_METHOD),
    url: trim(process.env.CD_FRONTEND_DEPLOY_HOOK_URL),
  },
  {
    name: 'backend',
    method: normalizeMethod(process.env.CD_BACKEND_DEPLOY_HOOK_METHOD),
    url: trim(process.env.CD_BACKEND_DEPLOY_HOOK_URL),
  },
];

const payload = {
  version: releaseVersion,
  targetEnvironment: releaseTarget,
  gitRef: trim(process.env.GITHUB_REF_NAME) ?? trim(process.env.GITHUB_REF) ?? 'local',
  gitSha: trim(process.env.GITHUB_SHA) ?? null,
  eventName: trim(process.env.GITHUB_EVENT_NAME) ?? 'local',
  generatedAt: new Date().toISOString(),
};

const configuredHooks = hookDefinitions.filter((hook) => hook.url);

await fs.mkdir(outputDir, { recursive: true });

if (configuredHooks.length === 0) {
  const skippedSummary = {
    targetEnvironment: releaseTarget,
    configured: false,
    hooks: [],
  };

  await fs.writeFile(
    path.join(outputDir, `deploy-hooks.${releaseTarget}.json`),
    `${JSON.stringify(skippedSummary, null, 2)}\n`,
    'utf8',
  );
  await fs.writeFile(
    path.join(outputDir, `deploy-hooks.${releaseTarget}.md`),
    '# Deploy Hooks\n\n- No deploy hooks configured for this environment.\n',
    'utf8',
  );
  console.log(`[ci] deploy hooks skipped for ${releaseTarget}: no hooks configured`);
  process.exit(0);
}

const triggerHook = async (hook) => {
  console.log(`[ci] triggering ${hook.name} deploy hook (${hook.method})`);

  const response = await fetch(hook.url, {
    method: hook.method,
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'EcoTrack-CD/1.0',
      'X-EcoTrack-Release-Target': releaseTarget,
      'X-EcoTrack-Release-Version': releaseVersion,
    },
    body: hook.method === 'POST' ? JSON.stringify(payload) : undefined,
    redirect: 'manual',
  });

  const responsePreview = await response
    .text()
    .then((value) => value.slice(0, 200))
    .catch(() => null);

  if (![200, 201, 202, 204, 301, 302, 303, 307, 308].includes(response.status)) {
    throw new Error(`${hook.name} deploy hook returned HTTP ${response.status}`);
  }

  return {
    name: hook.name,
    method: hook.method,
    status: 'triggered',
    httpStatus: response.status,
    responsePreview,
  };
};

const results = [];

for (const hook of configuredHooks) {
  const result = await triggerHook(hook);
  results.push(result);
}

const summary = {
  targetEnvironment: releaseTarget,
  configured: true,
  hooks: results,
};

await fs.writeFile(
  path.join(outputDir, `deploy-hooks.${releaseTarget}.json`),
  `${JSON.stringify(summary, null, 2)}\n`,
  'utf8',
);
await fs.writeFile(
  path.join(outputDir, `deploy-hooks.${releaseTarget}.md`),
  `# Deploy Hooks\n\n${results
    .map(
      (result) =>
        `- ${result.name}: \`${result.status}\` via \`${result.method}\` (HTTP ${result.httpStatus})`,
    )
    .join('\n')}\n`,
  'utf8',
);

console.log(`[ci] deploy hooks completed for ${releaseTarget}`);
