import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const require = createRequire(import.meta.url);

const trim = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
};

const readJsonIfPresent = async (absolutePath) => {
  try {
    return JSON.parse(await fs.readFile(absolutePath, "utf8"));
  } catch {
    return null;
  }
};

const readRootPackageVersion = async () => {
  const packageJsonPath = path.join(repoRoot, "package.json");
  const rawPackageJson = await fs.readFile(packageJsonPath, "utf8");
  const parsedPackageJson = JSON.parse(rawPackageJson);
  return typeof parsedPackageJson.version === "string" && parsedPackageJson.version.trim()
    ? parsedPackageJson.version.trim()
    : "0.0.0";
};

const pathExists = async (absolutePath) => {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
};

const getLatestModifiedAt = async (directory, fileNames) => {
  let latestModifiedAt = null;

  for (const fileName of fileNames) {
    try {
      const stats = await fs.stat(path.join(directory, fileName));
      const modifiedAt = stats.mtime.getTime();
      if (latestModifiedAt == null || modifiedAt > latestModifiedAt) {
        latestModifiedAt = modifiedAt;
      }
    } catch {
      // Ignore transient or partial artifact reads.
    }
  }

  return latestModifiedAt;
};

const resolveQualityRoot = async () => {
  const configuredRoot = trim(process.env.ECOTRACK_QUALITY_OUTPUT_ROOT);

  if (configuredRoot) {
    return path.isAbsolute(configuredRoot)
      ? configuredRoot
      : path.resolve(repoRoot, configuredRoot);
  }

  const ciQualityRoot = path.join(repoRoot, "tmp", "ci", "quality");
  if (await pathExists(ciQualityRoot)) {
    return ciQualityRoot;
  }

  return path.join(repoRoot, "tmp", "quality");
};

const releaseTarget = trim(process.env.CD_TARGET_ENV) ?? "development";
const releaseVersion = await readRootPackageVersion();
const qualityRoot = await resolveQualityRoot();
const releaseOutputDir = path.join(repoRoot, "tmp", "ci", "release");
const syntheticOutputDir = path.join(repoRoot, "tmp", "ci", "synthetic");
const generatedAt = new Date().toISOString();

const coverageTargets = {
  app: { statements: 80, branches: 70, functions: 80, lines: 80 },
  mobile: { statements: 80, branches: 70, functions: 80, lines: 80 },
  api: { statements: 85, branches: 70, functions: 85, lines: 85 },
};

const buildCoverageCard = (label, summary, target) => {
  if (!summary?.total) {
    return {
      label,
      target,
      actual: null,
      status: "unknown",
      detail: "Coverage summary not available.",
    };
  }

  const actual = {
    statements: Number(summary.total.statements?.pct ?? 0),
    branches: Number(summary.total.branches?.pct ?? 0),
    functions: Number(summary.total.functions?.pct ?? 0),
    lines: Number(summary.total.lines?.pct ?? 0),
  };
  const passed = Object.entries(target).every(([key, value]) => actual[key] >= value);

  return {
    label,
    target,
    actual,
    status: passed ? "pass" : "fail",
    detail: `${actual.statements.toFixed(2)}/${actual.branches.toFixed(2)}/${actual.functions.toFixed(2)}/${actual.lines.toFixed(2)}`,
  };
};

const lighthouseConfig = require(path.join(repoRoot, "app", "lighthouserc.cjs"));
const lighthouseAssertions = lighthouseConfig.ci.assert.assertions;
const lighthouseEvidenceDir = path.join(qualityRoot, "lighthouse");
const lighthouseEvidencePresent = await pathExists(lighthouseEvidenceDir);
const lighthouseFiles = lighthouseEvidencePresent ? await fs.readdir(lighthouseEvidenceDir) : [];
const lighthouseReportFiles = lighthouseFiles.filter((fileName) => fileName.endsWith(".report.json"));
const lighthouseLatestModifiedAt = lighthouseReportFiles.length
  ? await getLatestModifiedAt(lighthouseEvidenceDir, lighthouseReportFiles)
  : null;
const LIGHTHOUSE_EVIDENCE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const lighthouseEvidenceIsFresh =
  lighthouseLatestModifiedAt != null && Date.now() - lighthouseLatestModifiedAt <= LIGHTHOUSE_EVIDENCE_MAX_AGE_MS;

const appCoverageSummary = await readJsonIfPresent(path.join(qualityRoot, "coverage", "app", "coverage-summary.json"));
const mobileCoverageSummary = await readJsonIfPresent(path.join(qualityRoot, "coverage", "mobile", "coverage-summary.json"));
const apiCoverageSummary = await readJsonIfPresent(path.join(qualityRoot, "coverage", "api", "coverage-summary.json"));
const bundleBudgetSummary = await readJsonIfPresent(path.join(qualityRoot, "bundle-budgets", "summary.json"));
const mobileReadinessSummary = await readJsonIfPresent(path.join(qualityRoot, "mobile-readiness", "summary.json"));
const releaseManifestSummary = await readJsonIfPresent(
  path.join(releaseOutputDir, `release-manifest.${releaseTarget}.json`),
);
const deployHooksSummary = await readJsonIfPresent(
  path.join(releaseOutputDir, `deploy-hooks.${releaseTarget}.json`),
);
const releaseSmokeSummary = await readJsonIfPresent(
  path.join(releaseOutputDir, `release-smoke.${releaseTarget}.json`),
);
const syntheticSummary = await readJsonIfPresent(
  path.join(syntheticOutputDir, `synthetic-monitoring.${releaseTarget}.json`),
);

const coverageCards = [
  buildCoverageCard("Web app", appCoverageSummary, coverageTargets.app),
  buildCoverageCard("Mobile", mobileCoverageSummary, coverageTargets.mobile),
  buildCoverageCard("API", apiCoverageSummary, coverageTargets.api),
];

const bundleBudgetCard = bundleBudgetSummary
  ? {
      status: bundleBudgetSummary.results.every((result) => result.passed) ? "pass" : "fail",
      results: bundleBudgetSummary.results,
    }
  : {
      status: "unknown",
      results: [],
    };

const mobileReadinessCard = mobileReadinessSummary
  ? {
      status: mobileReadinessSummary.success ? "pass" : "fail",
      checks: mobileReadinessSummary.checks,
    }
  : {
      status: "unknown",
      checks: [],
    };

const smokeCard = releaseSmokeSummary
  ? {
      status: releaseSmokeSummary.success ? "pass" : "fail",
      configured: releaseSmokeSummary.configured,
      checks: releaseSmokeSummary.checks,
    }
  : {
      status: "unknown",
      configured: false,
      checks: [],
    };

const syntheticCard = syntheticSummary
  ? {
      status: syntheticSummary.success ? "pass" : "fail",
      configured: syntheticSummary.configured,
      checks: syntheticSummary.checks,
    }
  : {
      status: "unknown",
      configured: false,
      checks: [],
    };

const criticalFlowEvidence = [
  {
    name: "Web role-critical journeys",
    command: "npm run test:e2e",
    evidence: ["app/src/tests/e2e.key-journeys.test.tsx"],
  },
  {
    name: "Web realtime fallback and reconnect",
    command: "npm run test:realtime",
    evidence: [
      "app/src/tests/usePlanningRealtimeSocket.test.tsx",
      "app/src/tests/usePlanningRealtimeStream.test.tsx",
      "app/src/tests/Dashboard.realtimeTransport.test.tsx",
    ],
  },
  {
    name: "Mobile screen and session flows",
    command: "npm run quality:mobile-readiness",
    evidence: [
      "mobile/src/tests/LoginScreen.test.tsx",
      "mobile/src/tests/ReportScreen.test.tsx",
      "mobile/src/tests/ManagerHomeScreen.test.tsx",
      "mobile/src/tests/AgentHomeScreen.test.tsx",
      "mobile/src/tests/SessionProvider.test.tsx",
    ],
  },
  {
    name: "API degraded and recovery smoke",
    command: "npm run test:coverage:api",
    evidence: [
      "api/src/tests/admin-and-citizen-http-smoke.test.ts",
      "api/src/tests/domain-write-http-smoke.test.ts",
      "api/src/tests/admin.settings.repository.branches.test.ts",
      "api/src/tests/planning.service.branches.test.ts",
      "api/src/tests/monitoring.service.branches.test.ts",
      "api/src/tests/validation.test.ts",
    ],
  },
];

const scorecard = {
  generatedAt,
  scope: "Development only",
  release: {
    targetEnvironment: releaseTarget,
    version: releaseVersion,
    manifestPresent: Boolean(releaseManifestSummary),
    deployHooksPresent: Boolean(deployHooksSummary),
  },
  coverage: coverageCards,
  lighthouse: {
    status:
      lighthouseReportFiles.length > 0 && lighthouseEvidenceIsFresh
        ? "pass"
        : lighthouseReportFiles.length > 0
          ? "unknown"
          : "unknown",
    urls: lighthouseConfig.ci.collect.url,
    thresholds: {
      performance: lighthouseAssertions["categories:performance"]?.[1]?.minScore ?? null,
      accessibility: lighthouseAssertions["categories:accessibility"]?.[1]?.minScore ?? null,
      bestPractices: lighthouseAssertions["categories:best-practices"]?.[1]?.minScore ?? null,
      seo: lighthouseAssertions["categories:seo"]?.[1]?.minScore ?? null,
      totalByteWeight: lighthouseAssertions["total-byte-weight"]?.[1]?.maxNumericValue ?? null,
    },
    evidenceFiles: lighthouseReportFiles,
    note:
      lighthouseReportFiles.length === 0
        ? "No Lighthouse report artifacts were found in the configured quality output root."
        : lighthouseEvidenceIsFresh
          ? "Fresh Lighthouse report artifacts are present from the repo-owned gate."
          : "Only stale Lighthouse report artifacts were found; rerun the gate to refresh release evidence.",
  },
  bundleBudgets: {
    status: bundleBudgetCard.status,
    results: bundleBudgetCard.results,
  },
  mobileReadiness: {
    status: mobileReadinessCard.status,
    checks: mobileReadinessCard.checks,
  },
  releaseEvidence: {
    hostedSmoke: smokeCard,
    syntheticMonitoring: syntheticCard,
  },
  criticalFlowEvidence,
  documentation: {
    canonicalDoc: "docs/governance/QUALITY_SCORECARD.md",
  },
};

const markdownLines = [
  "# Development Quality Scorecard",
  "",
  `- Generated at: \`${generatedAt}\``,
  "- Scope: `Development only`",
  `- Target environment: \`${releaseTarget}\``,
  `- Release version: \`${releaseVersion}\``,
  "",
  "## Coverage",
  "",
  ...coverageCards.map((card) => {
    if (!card.actual) {
      return `- ${card.label}: \`${card.status}\` - ${card.detail}`;
    }

    return `- ${card.label}: \`${card.status}\` - actual \`${card.actual.statements.toFixed(2)}/${card.actual.branches.toFixed(2)}/${card.actual.functions.toFixed(2)}/${card.actual.lines.toFixed(2)}\` vs target \`${card.target.statements}/${card.target.branches}/${card.target.functions}/${card.target.lines}\``;
  }),
  "",
  "## Web Quality",
  "",
  `- Lighthouse: \`${scorecard.lighthouse.status}\` - URLs ${scorecard.lighthouse.urls.map((url) => `\`${url}\``).join(", ")} with thresholds performance \`${scorecard.lighthouse.thresholds.performance}\`, accessibility \`${scorecard.lighthouse.thresholds.accessibility}\`, best-practices \`${scorecard.lighthouse.thresholds.bestPractices}\`, seo \`${scorecard.lighthouse.thresholds.seo}\`, total-byte-weight \`${scorecard.lighthouse.thresholds.totalByteWeight}\`.`,
  `- Bundle budgets: \`${scorecard.bundleBudgets.status}\` - route-aware budgets recorded at \`tmp/ci/quality/bundle-budgets/summary.json\`.`,
  ...scorecard.bundleBudgets.results.map(
    (result) =>
      `- ${result.label}: \`${result.passed ? "pass" : "fail"}\` - \`${result.totalKb} kB\` vs budget \`${result.budgetKb} kB\``,
  ),
  "",
  "## Mobile",
  "",
  `- Mobile readiness: \`${scorecard.mobileReadiness.status}\` - repo-owned readiness evidence recorded at \`tmp/ci/quality/mobile-readiness/summary.json\`.`,
  "",
  "## Release Evidence",
  "",
  `- Hosted smoke: \`${scorecard.releaseEvidence.hostedSmoke.status}\` - artifact \`tmp/ci/release/release-smoke.${releaseTarget}.json\`.`,
  `- Synthetic monitoring: \`${scorecard.releaseEvidence.syntheticMonitoring.status}\` - artifact \`tmp/ci/synthetic/synthetic-monitoring.${releaseTarget}.json\`.`,
  "",
  "## Critical Flow Evidence",
  "",
  ...criticalFlowEvidence.map(
    (entry) => `- ${entry.name}: run \`${entry.command}\`; evidence ${entry.evidence.map((file) => `\`${file}\``).join(", ")}`,
  ),
  "",
  `Canonical scorecard policy: \`${scorecard.documentation.canonicalDoc}\``,
];

await fs.mkdir(releaseOutputDir, { recursive: true });
await fs.writeFile(
  path.join(releaseOutputDir, `quality-scorecard.${releaseTarget}.json`),
  `${JSON.stringify(scorecard, null, 2)}\n`,
  "utf8",
);
await fs.writeFile(
  path.join(releaseOutputDir, `quality-scorecard.${releaseTarget}.md`),
  `${markdownLines.join("\n")}\n`,
  "utf8",
);

console.log(`[ci] quality scorecard generated for ${releaseTarget} (${releaseVersion})`);
