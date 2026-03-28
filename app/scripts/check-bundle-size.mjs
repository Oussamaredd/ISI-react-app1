import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const distDir = path.join(appRoot, "dist");
const distAssetsDir = path.join(distDir, "assets");
const manifestPath = path.join(distDir, ".vite", "manifest.json");

const resolveQualityOutputRoot = () => {
  const configuredRoot = process.env.ECOTRACK_QUALITY_OUTPUT_ROOT?.trim();

  if (configuredRoot) {
    return path.isAbsolute(configuredRoot)
      ? configuredRoot
      : path.resolve(appRoot, "..", configuredRoot);
  }

  return path.resolve(appRoot, "..", process.env.CI ? "tmp/ci/quality" : "tmp/quality");
};

const parseBudgetKb = (value, fallback, label) => {
  const parsed = Number.parseInt(value ?? String(fallback), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`[bundle-check] Invalid ${label} value: "${value}"`);
  }

  return parsed;
};

const BUDGETS = {
  initialShellGzipKb: parseBudgetKb(
    process.env.ECOTRACK_INITIAL_ROUTE_SHELL_GZIP_BUDGET_KB,
    450,
    "ECOTRACK_INITIAL_ROUTE_SHELL_GZIP_BUDGET_KB",
  ),
  landingRouteGzipKb: parseBudgetKb(
    process.env.ECOTRACK_LANDING_ROUTE_GZIP_BUDGET_KB,
    10,
    "ECOTRACK_LANDING_ROUTE_GZIP_BUDGET_KB",
  ),
  loginRouteGzipKb: parseBudgetKb(
    process.env.ECOTRACK_LOGIN_ROUTE_GZIP_BUDGET_KB,
    10,
    "ECOTRACK_LOGIN_ROUTE_GZIP_BUDGET_KB",
  ),
  dashboardRouteGzipKb: parseBudgetKb(
    process.env.ECOTRACK_DASHBOARD_ROUTE_GZIP_BUDGET_KB,
    50,
    "ECOTRACK_DASHBOARD_ROUTE_GZIP_BUDGET_KB",
  ),
  adminRouteGzipKb: parseBudgetKb(
    process.env.ECOTRACK_ADMIN_ROUTE_GZIP_BUDGET_KB,
    30,
    "ECOTRACK_ADMIN_ROUTE_GZIP_BUDGET_KB",
  ),
  mappingVendorGzipKb: parseBudgetKb(
    process.env.ECOTRACK_MAPPING_VENDOR_GZIP_BUDGET_KB,
    125,
    "ECOTRACK_MAPPING_VENDOR_GZIP_BUDGET_KB",
  ),
  brandLogoRawKb: parseBudgetKb(
    process.env.ECOTRACK_LOGO_BUDGET_KB,
    120,
    "ECOTRACK_LOGO_BUDGET_KB",
  ),
};

const toDisplayKb = (sizeInBytes) => (sizeInBytes / 1024).toFixed(2);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const indexManifestEntry = manifest["index.html"];
const fileSizeCache = new Map();

const resolveManifestEntry = (key) => {
  const entry = manifest[key];

  if (!entry) {
    throw new Error(`[bundle-check] Missing manifest entry for ${key}`);
  }

  return entry;
};

const isBundledIntoInitialShell = (key) =>
  !manifest[key] && !(indexManifestEntry?.dynamicImports ?? []).includes(key);

const collectManifestFiles = (key, visitedKeys = new Set()) => {
  if (visitedKeys.has(key)) {
    return new Set();
  }

  visitedKeys.add(key);

  const entry = resolveManifestEntry(key);
  const files = new Set();

  if (entry.file) {
    files.add(entry.file);
  }

  for (const cssFile of entry.css ?? []) {
    files.add(cssFile);
  }

  for (const importKey of entry.imports ?? []) {
    for (const importedFile of collectManifestFiles(importKey, visitedKeys)) {
      files.add(importedFile);
    }
  }

  return files;
};

const collectRouteDeltaFiles = (key) => {
  // Eager routes do not always receive their own manifest entry. When that
  // happens, the route has no standalone transfer delta to budget.
  if (!manifest[key] || isBundledIntoInitialShell(key)) {
    return new Set();
  }

  return collectManifestFiles(key);
};

const readFileMetrics = async (repoRelativeFile) => {
  if (fileSizeCache.has(repoRelativeFile)) {
    return fileSizeCache.get(repoRelativeFile);
  }

  const absolutePath = path.join(distDir, repoRelativeFile.replace(/^assets\//, "assets/"));
  const rawBuffer = await readFile(absolutePath);
  const metrics = {
    file: repoRelativeFile,
    gzipBytes: gzipSync(rawBuffer).length,
    rawBytes: rawBuffer.length,
  };

  fileSizeCache.set(repoRelativeFile, metrics);
  return metrics;
};

const summarizeFiles = async (label, files, budgetKb, metric = "gzipBytes", allowEmpty = false) => {
  const uniqueFiles = [...new Set(files)].sort();

  if (uniqueFiles.length === 0) {
    if (!allowEmpty) {
      throw new Error(`[bundle-check] ${label} did not resolve to any files.`);
    }

    console.log(
      `[bundle-check] ${label}: 0.00 kB (${metric === "gzipBytes" ? "gzip" : "raw"}) (budget ${budgetKb} kB)`,
    );

    return {
      budgetKb,
      files: [],
      label,
      metric,
      passed: true,
      totalBytes: 0,
    };
  }

  const fileMetrics = await Promise.all(uniqueFiles.map((file) => readFileMetrics(file)));
  const totalBytes = fileMetrics.reduce((sum, fileMetric) => sum + fileMetric[metric], 0);
  const budgetBytes = budgetKb * 1024;

  console.log(
    `[bundle-check] ${label}: ${toDisplayKb(totalBytes)} kB (${metric === "gzipBytes" ? "gzip" : "raw"}) (budget ${budgetKb} kB)`,
  );

  return {
    budgetKb,
    files: fileMetrics,
    label,
    metric,
    passed: totalBytes <= budgetBytes,
    totalBytes,
  };
};

const shellFiles = collectManifestFiles("index.html");
const landingRouteFiles = [...collectRouteDeltaFiles("src/pages/landing/LandingPage.tsx")].filter(
  (file) => !shellFiles.has(file),
);
const loginRouteFiles = [...collectRouteDeltaFiles("src/pages/auth/LoginPage.tsx")].filter(
  (file) => !shellFiles.has(file),
);
const dashboardRouteFiles = [...collectRouteDeltaFiles("src/pages/Dashboard.tsx")].filter(
  (file) => !shellFiles.has(file),
);
const adminRouteFiles = [...collectRouteDeltaFiles("src/pages/AdminDashboard.tsx")].filter(
  (file) => !shellFiles.has(file),
);
const mappingVendorFiles = [...new Set(
  Object.values(manifest)
    .map((entry) => entry.file)
    .filter((file) => /^assets\/mapping-vendor-.*\.js$/.test(file ?? "")),
)];

const results = [
  await summarizeFiles("Initial route shell transfer", [...shellFiles], BUDGETS.initialShellGzipKb),
  await summarizeFiles("Landing route delta", landingRouteFiles, BUDGETS.landingRouteGzipKb, "gzipBytes", true),
  await summarizeFiles("Login route delta", loginRouteFiles, BUDGETS.loginRouteGzipKb, "gzipBytes", true),
  await summarizeFiles("Dashboard route delta", dashboardRouteFiles, BUDGETS.dashboardRouteGzipKb, "gzipBytes", true),
  await summarizeFiles("Admin route delta", adminRouteFiles, BUDGETS.adminRouteGzipKb, "gzipBytes", true),
  await summarizeFiles("Mapping vendor chunk", mappingVendorFiles, BUDGETS.mappingVendorGzipKb),
];

const assetNames = await readdir(distAssetsDir);
const brandLogoAssetNames = assetNames.filter((file) => /^ecotrack-logo-.*\.(png|webp|avif)$/.test(file));

if (brandLogoAssetNames.length > 0) {
  let largestLogo = null;

  for (const fileName of brandLogoAssetNames) {
    const fileStats = await stat(path.join(distAssetsDir, fileName));

    if (!largestLogo || fileStats.size > largestLogo.rawBytes) {
      largestLogo = {
        file: `assets/${fileName}`,
        gzipBytes: gzipSync(await readFile(path.join(distAssetsDir, fileName))).length,
        rawBytes: fileStats.size,
      };
    }
  }

  if (largestLogo) {
    const budgetBytes = BUDGETS.brandLogoRawKb * 1024;
    console.log(
      `[bundle-check] Brand logo ${largestLogo.file}: ${toDisplayKb(largestLogo.rawBytes)} kB raw (budget ${BUDGETS.brandLogoRawKb} kB)`,
    );

    results.push({
      budgetKb: BUDGETS.brandLogoRawKb,
      files: [largestLogo],
      label: "Brand logo asset",
      metric: "rawBytes",
      passed: largestLogo.rawBytes <= budgetBytes,
      totalBytes: largestLogo.rawBytes,
    });
  }
}

const qualityOutputDir = path.join(resolveQualityOutputRoot(), "bundle-budgets");
await mkdir(qualityOutputDir, { recursive: true });

const summaryPayload = {
  generatedAt: new Date().toISOString(),
  results: results.map((result) => ({
    budgetKb: result.budgetKb,
    files: result.files.map((file) => ({
      file: file.file,
      gzipKb: Number(toDisplayKb(file.gzipBytes)),
      rawKb: Number(toDisplayKb(file.rawBytes)),
    })),
    label: result.label,
    metric: result.metric,
    passed: result.passed,
    totalKb: Number(toDisplayKb(result.totalBytes)),
  })),
};

const markdownLines = [
  "# Bundle Budget Summary",
  "",
  `- Generated at: \`${summaryPayload.generatedAt}\``,
  "",
];

for (const result of results) {
  markdownLines.push(`## ${result.label}`);
  markdownLines.push("");
  markdownLines.push(
    `- Total: \`${toDisplayKb(result.totalBytes)} kB\` (${result.metric === "gzipBytes" ? "gzip" : "raw"})`,
  );
  markdownLines.push(`- Budget: \`${result.budgetKb} kB\``);
  markdownLines.push(`- Status: \`${result.passed ? "pass" : "fail"}\``);
  markdownLines.push("- Files:");

  for (const file of result.files) {
    markdownLines.push(
      `  - \`${file.file}\` raw \`${toDisplayKb(file.rawBytes)} kB\`, gzip \`${toDisplayKb(file.gzipBytes)} kB\``,
    );
  }

  markdownLines.push("");
}

await writeFile(
  path.join(qualityOutputDir, "summary.json"),
  `${JSON.stringify(summaryPayload, null, 2)}\n`,
  "utf8",
);
await writeFile(path.join(qualityOutputDir, "summary.md"), `${markdownLines.join("\n")}\n`, "utf8");

const failures = results.filter((result) => !result.passed);

if (failures.length > 0) {
  throw new Error(
    `[bundle-check] Budget failures: ${failures
      .map((result) => `${result.label} ${toDisplayKb(result.totalBytes)} kB > ${result.budgetKb} kB`)
      .join("; ")}`,
  );
}
