import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const outputDir = path.join(repoRoot, 'tmp', 'ci', 'synthetic');

const trim = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const readText = async (response) => {
  try {
    return await response.text();
  } catch {
    return null;
  }
};

const readJson = async (response) => {
  try {
    return await response.json();
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

const baseHeaders = {
  Accept: 'application/json, text/html,application/xhtml+xml',
  'User-Agent': 'EcoTrack-Synthetic/1.0',
};

const releaseTarget = trim(process.env.CD_TARGET_ENV) ?? 'development';
const appUrl = trim(process.env.CD_DEPLOY_APP_URL);
const apiHealthUrl = trim(process.env.CD_DEPLOY_API_HEALTH_URL);
const frontendHealthUrl = trim(process.env.CD_DEPLOY_FRONTEND_HEALTH_URL);
const oauthEntryUrl = trim(process.env.CD_DEPLOY_OAUTH_ENTRY_URL);
const expectedOauthCallbackUrl = trim(process.env.CD_DEPLOY_EXPECTED_OAUTH_CALLBACK_URL);
const syntheticUserEmail = trim(process.env.CD_SYNTHETIC_USER_EMAIL);
const syntheticUserPassword = trim(process.env.CD_SYNTHETIC_USER_PASSWORD);
const expectedUserRole = trim(process.env.CD_SYNTHETIC_EXPECTED_USER_ROLE);
const confirmRetries = toPositiveInt(process.env.CD_SYNTHETIC_CONFIRM_RETRIES, 2);
const retryIntervalMs = toPositiveInt(process.env.CD_SYNTHETIC_RETRY_INTERVAL_MS, 5000);

const sleep = (durationMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

const buildUrl = (baseUrl, relativePath) => new URL(relativePath, baseUrl).toString();

const toCheck = ({ name, ok, detail, skipped = false, required = true, payload = null }) => ({
  name,
  ok,
  detail,
  skipped,
  required,
  payload,
});

const inspectHtmlPage = async ({ name, url, expectedSnippet = null }) => {
  const { response, error } = await safeFetch(url, {
    headers: baseHeaders,
    redirect: 'manual',
  });

  if (!response) {
    return toCheck({
      name,
      ok: false,
      detail: `request to ${url} failed (${error})`,
    });
  }

  const body = await readText(response);
  if (response.status !== 200) {
    return toCheck({
      name,
      ok: false,
      detail: `expected 200 from ${url}, received ${response.status}`,
    });
  }

  if (!body || !body.includes('<html')) {
    return toCheck({
      name,
      ok: false,
      detail: `${url} did not return HTML`,
    });
  }

  if (expectedSnippet && !body.includes(expectedSnippet)) {
    return toCheck({
      name,
      ok: false,
      detail: `${url} did not include expected marker '${expectedSnippet}'`,
    });
  }

  return toCheck({
    name,
    ok: true,
    detail: `${url} returned HTML successfully`,
  });
};

const inspectApiReadiness = async () => {
  const { response, error } = await safeFetch(apiHealthUrl, {
    headers: {
      ...baseHeaders,
      Accept: 'application/json',
    },
    redirect: 'manual',
  });

  if (!response) {
    return toCheck({
      name: 'api-readiness',
      ok: false,
      detail: `request to ${apiHealthUrl} failed (${error})`,
    });
  }

  const payload = await readJson(response);
  if (response.status !== 200) {
    return toCheck({
      name: 'api-readiness',
      ok: false,
      detail: `expected 200 from ${apiHealthUrl}, received ${response.status}`,
      payload,
    });
  }

  if (!payload || payload.status !== 'ok') {
    return toCheck({
      name: 'api-readiness',
      ok: false,
      detail: `${apiHealthUrl} did not return an ok readiness payload`,
      payload,
    });
  }

  return toCheck({
    name: 'api-readiness',
    ok: true,
    detail: `${apiHealthUrl} returned an ok readiness payload`,
    payload,
  });
};

const inspectOptionalFrontendHealth = async () => {
  if (!frontendHealthUrl) {
    return toCheck({
      name: 'frontend-health',
      ok: true,
      skipped: true,
      required: false,
      detail: 'frontend health URL not configured',
    });
  }

  const { response, error } = await safeFetch(frontendHealthUrl, {
    headers: baseHeaders,
    redirect: 'manual',
  });

  if (!response) {
    return toCheck({
      name: 'frontend-health',
      ok: false,
      required: false,
      detail: `request to ${frontendHealthUrl} failed (${error})`,
    });
  }

  if (response.status !== 200) {
    return toCheck({
      name: 'frontend-health',
      ok: false,
      required: false,
      detail: `expected 200 from ${frontendHealthUrl}, received ${response.status}`,
    });
  }

  return toCheck({
    name: 'frontend-health',
    ok: true,
    required: false,
    detail: `${frontendHealthUrl} returned HTTP 200`,
  });
};

const inspectOauthEntry = async () => {
  if (!oauthEntryUrl) {
    return toCheck({
      name: 'oauth-entry',
      ok: true,
      skipped: true,
      required: false,
      detail: 'OAuth entry URL not configured',
    });
  }

  const { response, error } = await safeFetch(oauthEntryUrl, {
    headers: baseHeaders,
    redirect: 'manual',
  });

  if (!response) {
    return toCheck({
      name: 'oauth-entry',
      ok: false,
      required: false,
      detail: `request to ${oauthEntryUrl} failed (${error})`,
    });
  }

  if (![302, 303].includes(response.status)) {
    return toCheck({
      name: 'oauth-entry',
      ok: false,
      required: false,
      detail: `expected redirect from ${oauthEntryUrl}, received ${response.status}`,
    });
  }

  if (!expectedOauthCallbackUrl) {
    return toCheck({
      name: 'oauth-entry',
      ok: true,
      required: false,
      detail: `${oauthEntryUrl} returned redirect ${response.status}`,
    });
  }

  const locationHeader = response.headers.get('location');
  if (!locationHeader) {
    return toCheck({
      name: 'oauth-entry',
      ok: false,
      required: false,
      detail: `${oauthEntryUrl} redirect did not include a Location header`,
    });
  }

  try {
    const redirectUri = new URL(locationHeader).searchParams.get('redirect_uri');
    if (redirectUri !== expectedOauthCallbackUrl) {
      return toCheck({
        name: 'oauth-entry',
        ok: false,
        required: false,
        detail: `expected redirect_uri '${expectedOauthCallbackUrl}', received '${redirectUri ?? 'missing'}'`,
      });
    }
  } catch {
    return toCheck({
      name: 'oauth-entry',
      ok: false,
      required: false,
      detail: `${oauthEntryUrl} redirect Location was not a valid URL`,
    });
  }

  return toCheck({
    name: 'oauth-entry',
    ok: true,
    required: false,
    detail: `${oauthEntryUrl} redirect_uri matches ${expectedOauthCallbackUrl}`,
  });
};

const inspectLocalAuthJourney = async () => {
  if (!syntheticUserEmail || !syntheticUserPassword) {
    return [
      toCheck({
        name: 'local-login',
        ok: true,
        skipped: true,
        required: false,
        detail: 'synthetic local-auth credentials not configured',
      }),
      toCheck({
        name: 'authenticated-me',
        ok: true,
        skipped: true,
        required: false,
        detail: 'synthetic local-auth credentials not configured',
      }),
    ];
  }

  const loginUrl = buildUrl(apiHealthUrl, '/login');
  const meUrl = buildUrl(apiHealthUrl, '/me');
  const { response, error } = await safeFetch(loginUrl, {
    method: 'POST',
    headers: {
      ...baseHeaders,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: syntheticUserEmail,
      password: syntheticUserPassword,
    }),
    redirect: 'manual',
  });

  if (!response) {
    return [
      toCheck({
        name: 'local-login',
        ok: false,
        detail: `request to ${loginUrl} failed (${error})`,
      }),
      toCheck({
        name: 'authenticated-me',
        ok: false,
        detail: 'skipped because login failed',
      }),
    ];
  }

  const payload = await readJson(response);
  if (![200, 201].includes(response.status)) {
    return [
      toCheck({
        name: 'local-login',
        ok: false,
        detail: `expected 200/201 from ${loginUrl}, received ${response.status}`,
        payload,
      }),
      toCheck({
        name: 'authenticated-me',
        ok: false,
        detail: 'skipped because login failed',
      }),
    ];
  }

  const accessToken = payload?.accessToken;
  const user = payload?.user;
  if (typeof accessToken !== 'string' || !user || typeof user !== 'object') {
    return [
      toCheck({
        name: 'local-login',
        ok: false,
        detail: `${loginUrl} did not return accessToken and user payload`,
        payload,
      }),
      toCheck({
        name: 'authenticated-me',
        ok: false,
        detail: 'skipped because login response was incomplete',
      }),
    ];
  }

  const loginCheck = expectedUserRole && user.role !== expectedUserRole
    ? toCheck({
        name: 'local-login',
        ok: false,
        detail: `expected synthetic user role '${expectedUserRole}', received '${user.role ?? 'missing'}'`,
        payload,
      })
    : toCheck({
        name: 'local-login',
        ok: true,
        detail: `${loginUrl} authenticated synthetic user successfully`,
        payload,
      });

  const meResponse = await safeFetch(meUrl, {
    headers: {
      ...baseHeaders,
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    redirect: 'manual',
  });

  if (!meResponse.response) {
    return [
      loginCheck,
      toCheck({
        name: 'authenticated-me',
        ok: false,
        detail: `request to ${meUrl} failed (${meResponse.error})`,
      }),
    ];
  }

  const mePayload = await readJson(meResponse.response);
  if (meResponse.response.status !== 200) {
    return [
      loginCheck,
      toCheck({
        name: 'authenticated-me',
        ok: false,
        detail: `expected 200 from ${meUrl}, received ${meResponse.response.status}`,
        payload: mePayload,
      }),
    ];
  }

  const meUser = mePayload?.user;
  if (!meUser || typeof meUser !== 'object') {
    return [
      loginCheck,
      toCheck({
        name: 'authenticated-me',
        ok: false,
        detail: `${meUrl} did not return a user payload`,
        payload: mePayload,
      }),
    ];
  }

  if (expectedUserRole && meUser.role !== expectedUserRole) {
    return [
      loginCheck,
      toCheck({
        name: 'authenticated-me',
        ok: false,
        detail: `expected authenticated /me role '${expectedUserRole}', received '${meUser.role ?? 'missing'}'`,
        payload: mePayload,
      }),
    ];
  }

  return [
    loginCheck,
    toCheck({
      name: 'authenticated-me',
      ok: true,
      detail: `${meUrl} returned the authenticated synthetic user`,
      payload: mePayload,
    }),
  ];
};

const runChecks = async () => {
  const checks = [
    await inspectHtmlPage({
      name: 'frontend-root',
      url: appUrl,
    }),
    await inspectHtmlPage({
      name: 'frontend-login-route',
      url: buildUrl(appUrl, '/login'),
      expectedSnippet: 'Sign in',
    }),
    await inspectHtmlPage({
      name: 'frontend-dashboard-route',
      url: buildUrl(appUrl, '/app/dashboard'),
    }),
    await inspectApiReadiness(),
    await inspectOptionalFrontendHealth(),
    await inspectOauthEntry(),
    ...(await inspectLocalAuthJourney()),
  ];

  return checks;
};

const writeSummary = async (summary) => {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, `synthetic-monitoring.${releaseTarget}.json`),
    `${JSON.stringify(summary, null, 2)}\n`,
    'utf8',
  );

  await fs.writeFile(
    path.join(outputDir, `synthetic-monitoring.${releaseTarget}.md`),
    `# Synthetic Monitoring\n\n- Configured: \`${summary.configured}\`\n- Target environment: \`${summary.targetEnvironment}\`\n- Success: \`${summary.success}\`\n- Attempts used: \`${summary.attemptsUsed}\`\n- Confirmation retries: \`${summary.confirmRetries}\`\n${summary.checks
      .map((check) => `- ${check.name}: \`${check.ok}\`${check.skipped ? ' (skipped)' : ''} - ${check.detail}`)
      .join('\n')}\n`,
    'utf8',
  );
};

if (!appUrl || !apiHealthUrl) {
  const skippedSummary = {
    configured: false,
    success: false,
    targetEnvironment: releaseTarget,
    attemptsUsed: 0,
    confirmRetries,
    checks: [
      toCheck({
        name: 'configuration',
        ok: false,
        detail: 'CD_DEPLOY_APP_URL and CD_DEPLOY_API_HEALTH_URL are required for synthetic monitoring.',
      }),
    ],
  };
  await writeSummary(skippedSummary);
  console.log(`[ci] synthetic monitoring skipped for ${releaseTarget}: deployment URLs not configured`);
  process.exit(0);
}

let latestSummary = null;

for (let attempt = 1; attempt <= confirmRetries + 1; attempt += 1) {
  const checks = await runChecks();
  const success = checks.every((check) => check.ok || check.skipped);

  latestSummary = {
    configured: true,
    success,
    targetEnvironment: releaseTarget,
    attemptsUsed: attempt,
    confirmRetries,
    checks,
  };

  if (success) {
    await writeSummary(latestSummary);
    console.log(`[ci] synthetic monitoring passed for ${releaseTarget}`);
    process.exit(0);
  }

  if (attempt < confirmRetries + 1) {
    await sleep(retryIntervalMs);
  }
}

await writeSummary(latestSummary);
console.error(`[ci] synthetic monitoring failed for ${releaseTarget}`);
process.exit(1);
