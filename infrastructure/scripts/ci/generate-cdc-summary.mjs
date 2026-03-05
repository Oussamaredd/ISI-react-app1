import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceOfTruthPath = path.resolve("docs/specs/source-of-truth.dev.json");
const matrixPath = path.resolve("docs/specs/cdc-traceability-matrix.dev.json");
const outputDir = path.resolve("tmp/ci");

const sourceOfTruth = JSON.parse(await readFile(sourceOfTruthPath, "utf8"));
const matrix = JSON.parse(await readFile(matrixPath, "utf8"));

const requiredUseCaseIds = new Set(sourceOfTruth.requiredUseCaseIds ?? []);
const useCases = matrix.useCases ?? [];

const coveredUseCases = useCases.filter((useCase) => requiredUseCaseIds.has(useCase.id));

const summary = {
  generatedAt: new Date().toISOString(),
  specialty: sourceOfTruth.specialty,
  requiredUseCaseCount: requiredUseCaseIds.size,
  coveredUseCaseCount: coveredUseCases.length,
  requiredCiChecks: sourceOfTruth.requiredCiChecks ?? [],
  useCases: coveredUseCases.map((useCase) => ({
    id: useCase.id,
    status: useCase.status,
    apiTests: useCase.verification?.apiTests ?? [],
    appTests: useCase.verification?.appTests ?? [],
    ciChecks: useCase.verification?.ciChecks ?? [],
  })),
};

const markdownLines = [
  "# CDC Contract Summary",
  "",
  `Generated: ${summary.generatedAt}`,
  `Specialty: ${summary.specialty}`,
  `Required use cases: ${summary.requiredUseCaseCount}`,
  `Covered use cases in matrix: ${summary.coveredUseCaseCount}`,
  "",
  "## Required CI checks",
  ...summary.requiredCiChecks.map((check) => `- ${check}`),
  "",
  "## Use case evidence",
  "| Use case | Status | API tests | App tests | CI checks |",
  "| --- | --- | --- | --- | --- |",
  ...summary.useCases.map((useCase) => {
    const apiTests = useCase.apiTests.length > 0 ? useCase.apiTests.join("<br>") : "none";
    const appTests = useCase.appTests.length > 0 ? useCase.appTests.join("<br>") : "none";
    const ciChecks = useCase.ciChecks.length > 0 ? useCase.ciChecks.join("<br>") : "none";

    return `| ${useCase.id} | ${useCase.status} | ${apiTests} | ${appTests} | ${ciChecks} |`;
  }),
  "",
];

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "cdc-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
await writeFile(path.join(outputDir, "cdc-summary.md"), `${markdownLines.join("\n")}\n`, "utf8");

console.log("[ci] CDC summary generated at tmp/ci/cdc-summary.json and tmp/ci/cdc-summary.md");
