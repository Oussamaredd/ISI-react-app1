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
const generatedAt = new Date().toISOString();

const manifest = {
  generatedAt,
  release: {
    targetEnvironment: releaseTarget,
    version: releaseVersion,
    gitRef: trim(process.env.GITHUB_REF_NAME) ?? trim(process.env.GITHUB_REF) ?? 'local',
    gitSha: trim(process.env.GITHUB_SHA) ?? null,
    eventName: trim(process.env.GITHUB_EVENT_NAME) ?? 'local',
    actor: trim(process.env.GITHUB_ACTOR) ?? null,
    runId: trim(process.env.GITHUB_RUN_ID) ?? null,
    runAttempt: trim(process.env.GITHUB_RUN_ATTEMPT) ?? null,
  },
  deployment: {
    appUrl: trim(process.env.CD_DEPLOY_APP_URL),
    apiHealthUrl: trim(process.env.CD_DEPLOY_API_HEALTH_URL),
    frontendHookConfigured: Boolean(trim(process.env.CD_FRONTEND_DEPLOY_HOOK_URL)),
    backendHookConfigured: Boolean(trim(process.env.CD_BACKEND_DEPLOY_HOOK_URL)),
  },
};

const markdownLines = [
  '# Release Manifest',
  '',
  `- Generated at: \`${manifest.generatedAt}\``,
  `- Target environment: \`${manifest.release.targetEnvironment}\``,
  `- Release version: \`${manifest.release.version}\``,
  `- Git ref: \`${manifest.release.gitRef}\``,
  `- Git SHA: \`${manifest.release.gitSha ?? 'n/a'}\``,
  `- Trigger: \`${manifest.release.eventName}\``,
  `- Actor: \`${manifest.release.actor ?? 'n/a'}\``,
  `- App URL configured: \`${manifest.deployment.appUrl ?? 'no'}\``,
  `- API health URL configured: \`${manifest.deployment.apiHealthUrl ?? 'no'}\``,
  `- Frontend deploy hook configured: \`${manifest.deployment.frontendHookConfigured}\``,
  `- Backend deploy hook configured: \`${manifest.deployment.backendHookConfigured}\``,
];

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(
  path.join(outputDir, `release-manifest.${releaseTarget}.json`),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);
await fs.writeFile(
  path.join(outputDir, `release-manifest.${releaseTarget}.md`),
  `${markdownLines.join('\n')}\n`,
  'utf8',
);

console.log(`[ci] release manifest generated for ${releaseTarget} (${releaseVersion})`);
