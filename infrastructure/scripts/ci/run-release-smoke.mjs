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
const expectedApiReleaseVersion =
  trim(process.env.CD_DEPLOY_EXPECTED_API_RELEASE_VERSION) ?? (await readRootPackageVersion());
const appUrl = trim(process.env.CD_DEPLOY_APP_URL);
const apiHealthUrl = trim(process.env.CD_DEPLOY_API_HEALTH_URL);
const frontendHealthUrl = trim(process.env.CD_DEPLOY_FRONTEND_HEALTH_URL);
const oauthEntryUrl = trim(process.env.CD_DEPLOY_OAUTH_ENTRY_URL);
const expectedOauthCallbackUrl = trim(process.env.CD_DEPLOY_EXPECTED_OAUTH_CALLBACK_URL);
const expectedApiBaseUrl = trim(process.env.CD_DEPLOY_EXPECTED_API_BASE_URL);
const expectedFrontendReleaseVersion = trim(process.env.CD_DEPLOY_EXPECTED_FRONTEND_RELEASE_VERSION);
const timeoutMs = Number.parseInt(process.env.CD_RELEASE_SMOKE_TIMEOUT_MS ?? '600000', 10);
const intervalMs = Number.parseInt(process.env.CD_RELEASE_SMOKE_INTERVAL_MS ?? '15000', 10);
const deadline = Date.now() + Math.max(30_000, Number.isFinite(timeoutMs) ? timeoutMs : 600_000);

const sleep = (durationMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const readMetaContent = (html, metaName) => {
  const pattern = new RegExp(
    `<meta\\s+name=["']${escapeRegExp(metaName)}["']\\s+content=["']([^"']*)["']\\s*/?>`,
    'i',
  );
  const match = html.match(pattern);
  return match ? match[1] : null;
};

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const safeText = async (response) => {
  try {
    return await response.text();
  } catch {
    return null;
  }
};

const safeFetch = async (url, init) => {
  try {
    return {
      response: await fetch(url, init),
      error: null,
    };
  } catch (error) {
    return {
      response: null,
      error: error instanceof Error ? error.message : 'request failed',
    };
  }
};

const inspectApp = async () => {
  const { response, error } = await safeFetch(appUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'EcoTrack-CD/1.0',
    },
    redirect: 'manual',
  });

  if (!response) {
    return {
      name: 'frontend-root',
      ok: false,
      detail: `request to ${appUrl} failed (${error})`,
    };
  }

  const body = await safeText(response);
  if (response.status !== 200) {
    return {
      name: 'frontend-root',
      ok: false,
      detail: `expected 200 from ${appUrl}, received ${response.status}`,
    };
  }

  if (!body || !body.includes('<html')) {
    return {
      name: 'frontend-root',
      ok: false,
      detail: `${appUrl} did not return HTML`,
    };
  }

  if (expectedFrontendReleaseVersion) {
    const releaseMeta = readMetaContent(body, 'ecotrack-release-version');
    if (releaseMeta !== expectedFrontendReleaseVersion) {
      return {
        name: 'frontend-release-meta',
        ok: false,
        detail: `expected frontend release meta '${expectedFrontendReleaseVersion}', received '${releaseMeta ?? 'missing'}'`,
      };
    }
  }

  if (expectedApiBaseUrl) {
    const apiBaseMeta = readMetaContent(body, 'ecotrack-api-base-url');
    if (apiBaseMeta !== expectedApiBaseUrl) {
      return {
        name: 'frontend-api-base-meta',
        ok: false,
        detail: `expected frontend API-base meta '${expectedApiBaseUrl}', received '${apiBaseMeta ?? 'missing'}'`,
      };
    }
  }

  return {
    name: 'frontend-root',
    ok: true,
    detail: `${appUrl} returned HTML successfully`,
  };
};

const inspectApiHealth = async () => {
  const { response, error } = await safeFetch(apiHealthUrl, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'EcoTrack-CD/1.0',
    },
    redirect: 'manual',
  });

  if (!response) {
    return {
      name: 'api-health',
      ok: false,
      detail: `request to ${apiHealthUrl} failed (${error})`,
    };
  }

  const payload = await safeJson(response);
  if (response.status !== 200) {
    return {
      name: 'api-health',
      ok: false,
      detail: `expected 200 from ${apiHealthUrl}, received ${response.status}`,
      payload,
    };
  }

  if (!payload || payload.status !== 'ok') {
    return {
      name: 'api-health',
      ok: false,
      detail: `${apiHealthUrl} did not return an ok readiness payload`,
      payload,
    };
  }

  if (payload.release?.version !== expectedApiReleaseVersion) {
    return {
      name: 'api-release-version',
      ok: false,
      detail: `expected API release version '${expectedApiReleaseVersion}', received '${payload.release?.version ?? 'missing'}'`,
      payload,
    };
  }

  return {
    name: 'api-health',
    ok: true,
    detail: `${apiHealthUrl} returned ready payload for release ${payload.release.version}`,
    payload,
  };
};

const inspectOptionalHealth = async () => {
  if (!frontendHealthUrl) {
    return null;
  }

  const { response, error } = await safeFetch(frontendHealthUrl, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'EcoTrack-CD/1.0',
    },
    redirect: 'manual',
  });

  if (!response) {
    return {
      name: 'frontend-health',
      ok: false,
      detail: `request to ${frontendHealthUrl} failed (${error})`,
    };
  }

  if (response.status !== 200) {
    return {
      name: 'frontend-health',
      ok: false,
      detail: `expected 200 from ${frontendHealthUrl}, received ${response.status}`,
    };
  }

  return {
    name: 'frontend-health',
    ok: true,
    detail: `${frontendHealthUrl} returned HTTP 200`,
  };
};

const inspectOauth = async () => {
  if (!oauthEntryUrl) {
    return null;
  }

  const { response, error } = await safeFetch(oauthEntryUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'EcoTrack-CD/1.0',
    },
    redirect: 'manual',
  });

  if (!response) {
    return {
      name: 'oauth-entry',
      ok: false,
      detail: `request to ${oauthEntryUrl} failed (${error})`,
    };
  }

  if (![302, 303].includes(response.status)) {
    return {
      name: 'oauth-entry',
      ok: false,
      detail: `expected redirect from ${oauthEntryUrl}, received ${response.status}`,
    };
  }

  if (!expectedOauthCallbackUrl) {
    return {
      name: 'oauth-entry',
      ok: true,
      detail: `${oauthEntryUrl} returned redirect ${response.status}`,
    };
  }

  const locationHeader = response.headers.get('location');
  if (!locationHeader) {
    return {
      name: 'oauth-entry',
      ok: false,
      detail: `${oauthEntryUrl} redirect did not include a Location header`,
    };
  }

  let redirectUri = null;
  try {
    redirectUri = new URL(locationHeader).searchParams.get('redirect_uri');
  } catch {
    return {
      name: 'oauth-entry',
      ok: false,
      detail: `${oauthEntryUrl} redirect Location was not a valid URL`,
    };
  }

  if (redirectUri !== expectedOauthCallbackUrl) {
    return {
      name: 'oauth-entry',
      ok: false,
      detail: `expected redirect_uri '${expectedOauthCallbackUrl}', received '${redirectUri ?? 'missing'}'`,
    };
  }

  return {
    name: 'oauth-entry',
    ok: true,
    detail: `${oauthEntryUrl} redirect_uri matches ${expectedOauthCallbackUrl}`,
  };
};

const writeSummary = async (summary) => {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, `release-smoke.${releaseTarget}.json`),
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8',
  );
  await fs.writeFile(
    path.join(outputDir, `release-smoke.${releaseTarget}.md`),
    `# Release Smoke\n\n- Configured: \`${summary.configured}\`\n- Target environment: \`${summary.targetEnvironment}\`\n- Success: \`${summary.success}\`\n${summary.checks
      .map((check) => `- ${check.name}: \`${check.ok}\` - ${check.detail}`)
      .join('\n')}\n`,
    'utf8',
  );
};

if (!appUrl || !apiHealthUrl) {
  const skippedSummary = {
    configured: false,
    success: false,
    targetEnvironment: releaseTarget,
    checks: [
      {
        name: 'configuration',
        ok: false,
        detail: 'CD_DEPLOY_APP_URL and CD_DEPLOY_API_HEALTH_URL are required for hosted release smoke.',
      },
    ],
  };
  await writeSummary(skippedSummary);
  console.log(`[ci] hosted release smoke skipped for ${releaseTarget}: deployment URLs not configured`);
  process.exit(0);
}

let latestSummary = null;

while (Date.now() < deadline) {
  const requiredChecks = [await inspectApp(), await inspectApiHealth()];
  const optionalChecks = [await inspectOptionalHealth(), await inspectOauth()].filter(Boolean);
  const checks = [...requiredChecks, ...optionalChecks];

  latestSummary = {
    configured: true,
    success: checks.every((check) => check.ok),
    targetEnvironment: releaseTarget,
    checks,
  };

  if (latestSummary.success) {
    await writeSummary(latestSummary);
    console.log(`[ci] hosted release smoke passed for ${releaseTarget}`);
    process.exit(0);
  }

  await sleep(Math.max(1_000, Number.isFinite(intervalMs) ? intervalMs : 15_000));
}

await writeSummary(
  latestSummary ?? {
    configured: true,
    success: false,
    targetEnvironment: releaseTarget,
    checks: [
      {
        name: 'timeout',
        ok: false,
        detail: `release smoke timed out after ${timeoutMs}ms`,
      },
    ],
  },
);

console.error(`[ci] hosted release smoke failed for ${releaseTarget}`);
process.exit(1);
