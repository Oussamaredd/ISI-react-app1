import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distAssetsDir = path.resolve(__dirname, "..", "dist", "assets");

const parseBudgetKb = (value, fallback, label) => {
  const parsed = Number.parseInt(value ?? String(fallback), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`[bundle-check] Invalid ${label} value: "${value}"`);
  }
  return parsed;
};

const ENTRY_CHUNK_BUDGET_KB = parseBudgetKb(
  process.env.ECOTRACK_ENTRY_CHUNK_BUDGET_KB,
  300,
  "ECOTRACK_ENTRY_CHUNK_BUDGET_KB",
);
const BRAND_LOGO_BUDGET_KB = parseBudgetKb(
  process.env.ECOTRACK_LOGO_BUDGET_KB,
  120,
  "ECOTRACK_LOGO_BUDGET_KB",
);

const toBudgetBytes = (sizeInKb) => sizeInKb * 1024;
const toDisplayKb = (sizeInBytes) => (sizeInBytes / 1024).toFixed(2);

const assets = await readdir(distAssetsDir);

const findLargestByPattern = async (pattern) => {
  const matchingFiles = assets.filter((file) => pattern.test(file));
  if (matchingFiles.length === 0) {
    return null;
  }

  let largestFile = null;
  let largestSize = -1;

  for (const fileName of matchingFiles) {
    const filePath = path.resolve(distAssetsDir, fileName);
    const fileStats = await stat(filePath);

    if (fileStats.size > largestSize) {
      largestFile = fileName;
      largestSize = fileStats.size;
    }
  }

  return {
    fileName: largestFile,
    sizeInBytes: largestSize,
  };
};

const entryChunk = await findLargestByPattern(/^index-.*\.js$/);
if (!entryChunk) {
  throw new Error(`[bundle-check] No entry chunk matching /^index-.*\\.js$/ found in ${distAssetsDir}`);
}

const entryChunkBudgetBytes = toBudgetBytes(ENTRY_CHUNK_BUDGET_KB);
console.log(
  `[bundle-check] Entry chunk ${entryChunk.fileName}: ${toDisplayKb(entryChunk.sizeInBytes)} kB (budget ${ENTRY_CHUNK_BUDGET_KB} kB)`,
);

if (entryChunk.sizeInBytes > entryChunkBudgetBytes) {
  throw new Error(
    `[bundle-check] Entry chunk ${entryChunk.fileName} is ${toDisplayKb(entryChunk.sizeInBytes)} kB, above ${ENTRY_CHUNK_BUDGET_KB} kB.`,
  );
}

const brandLogoAsset = await findLargestByPattern(/^ecotrack-logo-.*\.(png|webp|avif)$/);
if (brandLogoAsset) {
  const brandLogoBudgetBytes = toBudgetBytes(BRAND_LOGO_BUDGET_KB);
  console.log(
    `[bundle-check] Brand logo ${brandLogoAsset.fileName}: ${toDisplayKb(brandLogoAsset.sizeInBytes)} kB (budget ${BRAND_LOGO_BUDGET_KB} kB)`,
  );

  if (brandLogoAsset.sizeInBytes > brandLogoBudgetBytes) {
    throw new Error(
      `[bundle-check] Brand logo asset ${brandLogoAsset.fileName} is ${toDisplayKb(brandLogoAsset.sizeInBytes)} kB, above ${BRAND_LOGO_BUDGET_KB} kB.`,
    );
  }
}
