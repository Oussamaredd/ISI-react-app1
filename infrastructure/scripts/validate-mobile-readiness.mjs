import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const resolveQualityOutputRoot = () => {
  const configuredRoot = process.env.ECOTRACK_QUALITY_OUTPUT_ROOT?.trim();

  if (configuredRoot) {
    return path.isAbsolute(configuredRoot)
      ? configuredRoot
      : path.resolve(repoRoot, configuredRoot);
  }

  return path.resolve(repoRoot, process.env.CI ? "tmp/ci/quality" : "tmp/quality");
};

const outputDir = path.join(resolveQualityOutputRoot(), "mobile-readiness");

const readText = async (relativePath) =>
  fs.readFile(path.join(repoRoot, relativePath), "utf8");

const readJson = async (relativePath) =>
  JSON.parse(await readText(relativePath));

const fileExists = async (relativePath) => {
  try {
    await fs.access(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
};

const createCheck = (name, ok, detail) => ({
  name,
  ok,
  detail,
});

const mobilePackageJson = await readJson("mobile/package.json");
const mobileEnvExample = await readText("mobile/.env.example");
const reactQueryLifecycleProvider = await readText("mobile/src/providers/ReactQueryLifecycleProvider.tsx");
const appProviders = await readText("mobile/src/providers/AppProviders.tsx");
const mobileSentryBridge = await readText("mobile/src/monitoring/MobileSentrySessionBridge.tsx");
const mobileSentry = await readText("mobile/src/monitoring/sentry.ts");
const mobileTelemetry = await readText("mobile/src/monitoring/clientTelemetry.ts");
const webSentry = await readText("app/src/monitoring/sentry.ts");
const sessionProviderTest = await readText("mobile/src/tests/SessionProvider.test.tsx");

const evidenceFiles = [
  "mobile/src/tests/LoginScreen.test.tsx",
  "mobile/src/tests/ReportScreen.test.tsx",
  "mobile/src/tests/ManagerHomeScreen.test.tsx",
  "mobile/src/tests/AgentHomeScreen.test.tsx",
  "mobile/src/tests/SessionProvider.test.tsx",
  "mobile/src/tests/ReactQueryLifecycleProvider.test.tsx",
  "mobile/src/tests/http.advanced.test.ts",
];

const evidenceFileChecks = await Promise.all(
  evidenceFiles.map(async (relativePath) =>
    createCheck(
      `evidence:${relativePath}`,
      await fileExists(relativePath),
      `${relativePath} is present for mobile workflow regression coverage.`,
    ),
  ),
);

const checks = [
  createCheck(
    "mobile coverage lane",
    typeof mobilePackageJson.scripts?.["test:coverage"] === "string",
    "The mobile workspace exposes a dedicated coverage command for release gating.",
  ),
  createCheck(
    "mobile readiness dependencies",
    Boolean(mobilePackageJson.dependencies?.["@sentry/react-native"]) &&
      Boolean(mobilePackageJson.dependencies?.["@react-native-community/netinfo"]),
    "The mobile client ships repo-owned Sentry crash capture and NetInfo reachability dependencies.",
  ),
  createCheck(
    "mobile env template",
    [
      "EXPO_PUBLIC_API_BASE_URL=",
      "EXPO_PUBLIC_SENTRY_DSN=",
      "EXPO_PUBLIC_SENTRY_ENVIRONMENT=",
      "EXPO_PUBLIC_RELEASE_VERSION=",
    ].every((key) => mobileEnvExample.includes(key)),
    "The mobile env template documents API base, Sentry, environment, and release-version keys.",
  ),
  createCheck(
    "offline and reconnect lifecycle wiring",
    /focusManager\.setFocused/.test(reactQueryLifecycleProvider) &&
      /onlineManager\.setEventListener/.test(reactQueryLifecycleProvider) &&
      /NetInfo\.addEventListener/.test(reactQueryLifecycleProvider),
    "TanStack Query is bridged to AppState focus and NetInfo reachability for offline and reconnect handling.",
  ),
  createCheck(
    "mobile provider crash-capture wiring",
    /initializeMobileErrorTracking/.test(appProviders) &&
      /<ReactQueryLifecycleProvider>/.test(appProviders) &&
      /<MobileSentrySessionBridge\s*\/>/.test(appProviders) &&
      /<MobileErrorBoundary>/.test(appProviders),
    "The mobile app provider tree initializes crash capture, session tagging, and query lifecycle handling.",
  ),
  createCheck(
    "mobile session tagging bridge",
    /syncMobileSentryUser/.test(mobileSentryBridge) &&
      /role: user\.role/.test(mobileSentryBridge) &&
      /provider: user\.provider/.test(mobileSentryBridge),
    "Authenticated mobile sessions forward role and provider tags into Sentry user scope updates.",
  ),
  createCheck(
    "mobile telemetry release tagging",
    /EXPO_PUBLIC_RELEASE_VERSION/.test(mobileSentry) &&
      /release:\s*MOBILE_SENTRY_RELEASE/.test(mobileSentry) &&
      /Sentry\.setTag\("ecotrack\.role"/.test(mobileSentry) &&
      /Sentry\.setTag\("ecotrack\.provider"/.test(mobileSentry),
    "Mobile Sentry initialization and scope tagging use the release-version env contract plus role/provider tags.",
  ),
  createCheck(
    "aggregate mobile telemetry forwarding",
    /\/api\/errors/.test(mobileTelemetry) &&
      /EXPO_PUBLIC_RELEASE_VERSION/.test(mobileTelemetry) &&
      /platform:\s*Platform\.OS/.test(mobileTelemetry),
    "Runtime crashes and client telemetry continue to flow through the aggregate API error channel with release and platform metadata.",
  ),
  createCheck(
    "web and mobile release identifier alignment",
    /VITE_RELEASE_VERSION/.test(webSentry) &&
      /EXPO_PUBLIC_RELEASE_VERSION/.test(mobileSentry) &&
      /Sentry\.setTag\("ecotrack\.role"/.test(webSentry) &&
      /Sentry\.setTag\("ecotrack\.role"/.test(mobileSentry),
    "Web and mobile clients share the same release-version tagging model and consistent role-based Sentry tagging.",
  ),
  createCheck(
    "degraded-session regression evidence",
    /offline/.test(sessionProviderTest),
    "SessionProvider coverage includes degraded-network logout behavior so local sign-out remains resilient.",
  ),
  ...evidenceFileChecks,
];

const success = checks.every((check) => check.ok);
const generatedAt = new Date().toISOString();

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(
  path.join(outputDir, "summary.json"),
  `${JSON.stringify(
    {
      generatedAt,
      success,
      scope: "Development only",
      evidenceFiles,
      checks,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const markdownLines = [
  "# Mobile Product Readiness",
  "",
  `- Generated at: \`${generatedAt}\``,
  "- Scope: `Development only`",
  `- Success: \`${success}\``,
  "",
  "## Checks",
  "",
  ...checks.map((check) => `- ${check.name}: \`${check.ok ? "pass" : "fail"}\` - ${check.detail}`),
];

await fs.writeFile(path.join(outputDir, "summary.md"), `${markdownLines.join("\n")}\n`, "utf8");

if (!success) {
  console.error("[mobile-readiness] FAIL");
  for (const check of checks.filter((entry) => !entry.ok)) {
    console.error(`- ${check.name}: ${check.detail}`);
  }
  process.exit(1);
}

console.log("[mobile-readiness] PASS");
