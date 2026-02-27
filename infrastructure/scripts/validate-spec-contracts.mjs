import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const sourceOfTruthRelativePath = 'docs/specs/source-of-truth.dev.json';
const sourceOfTruthAbsolutePath = path.join(repoRoot, sourceOfTruthRelativePath);

const errors = [];

const fail = (message) => {
  errors.push(message);
};

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const assertFileExists = (relativePath, context) => {
  if (!isNonEmptyString(relativePath)) {
    fail(`${context} must be a non-empty path`);
    return;
  }

  const normalizedPath = relativePath.replaceAll('/', path.sep);
  const absolutePath = path.join(repoRoot, normalizedPath);
  if (!fs.existsSync(absolutePath)) {
    fail(`${context} does not exist: ${relativePath}`);
  }
};

const readJson = (absolutePath, label) => {
  if (!fs.existsSync(absolutePath)) {
    fail(`${label} not found at ${path.relative(repoRoot, absolutePath)}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
};

const ensureStringArray = (value, label, minimumLength = 1) => {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array`);
    return [];
  }

  const badIndex = value.findIndex((entry) => !isNonEmptyString(entry));
  if (badIndex !== -1) {
    fail(`${label}[${badIndex}] must be a non-empty string`);
  }

  if (value.length < minimumLength) {
    fail(`${label} must contain at least ${minimumLength} item(s)`);
  }

  return value;
};

const parseEndpoint = (endpoint) => {
  if (!isNonEmptyString(endpoint)) {
    return null;
  }

  const separatorIndex = endpoint.indexOf(' ');
  if (separatorIndex <= 0 || separatorIndex === endpoint.length - 1) {
    return null;
  }

  const method = endpoint.slice(0, separatorIndex).trim();
  const uri = endpoint.slice(separatorIndex + 1).trim();
  if (!HTTP_METHODS.has(method)) {
    return null;
  }

  if (!uri.startsWith('/api/')) {
    return null;
  }

  if (!/^\/api\/[A-Za-z0-9\-._/:]+$/.test(uri)) {
    return null;
  }

  return { method, uri };
};

const sourceOfTruth = readJson(sourceOfTruthAbsolutePath, 'Source-of-truth file');
if (!sourceOfTruth) {
  process.exit(1);
}

if (sourceOfTruth.specialty !== 'development') {
  fail('source-of-truth.specialty must be "development"');
}

const requiredUseCaseIds = ensureStringArray(
  sourceOfTruth.requiredUseCaseIds,
  'source-of-truth.requiredUseCaseIds',
);
const allowedStatuses = new Set(
  ensureStringArray(sourceOfTruth.allowedStatuses, 'source-of-truth.allowedStatuses'),
);

const matrixRelativePath = sourceOfTruth.matrixFile;
if (!isNonEmptyString(matrixRelativePath)) {
  fail('source-of-truth.matrixFile must be a non-empty string');
}
assertFileExists(sourceOfTruthRelativePath, 'Source-of-truth file');

ensureStringArray(sourceOfTruth.inputArtifacts, 'source-of-truth.inputArtifacts').forEach((artifact, index) => {
  assertFileExists(artifact, `source-of-truth.inputArtifacts[${index}]`);
});

ensureStringArray(sourceOfTruth.canonicalFiles, 'source-of-truth.canonicalFiles').forEach((file, index) => {
  assertFileExists(file, `source-of-truth.canonicalFiles[${index}]`);
});

const requiredCiChecks = ensureStringArray(sourceOfTruth.requiredCiChecks, 'source-of-truth.requiredCiChecks');
const matrixAbsolutePath = path.join(repoRoot, matrixRelativePath ?? '');
const matrix = readJson(matrixAbsolutePath, 'CDC traceability matrix');

if (!matrix) {
  process.exit(1);
}

if (matrix?.meta?.specialty !== sourceOfTruth.specialty) {
  fail('matrix.meta.specialty must match source-of-truth.specialty');
}

if (matrix?.meta?.sourceOfTruth !== sourceOfTruthRelativePath) {
  fail(`matrix.meta.sourceOfTruth must be "${sourceOfTruthRelativePath}"`);
}

if (!Array.isArray(matrix.useCases) || matrix.useCases.length === 0) {
  fail('matrix.useCases must be a non-empty array');
}

const seenUseCaseIds = new Set();
const ciChecksSeen = new Set();
const statusCounter = new Map();

for (const [index, useCase] of (matrix.useCases ?? []).entries()) {
  const label = `matrix.useCases[${index}]`;

  if (!useCase || typeof useCase !== 'object') {
    fail(`${label} must be an object`);
    continue;
  }

  const id = useCase.id;
  if (!isNonEmptyString(id)) {
    fail(`${label}.id must be a non-empty string`);
    continue;
  }

  if (seenUseCaseIds.has(id)) {
    fail(`${label}.id is duplicated: ${id}`);
  }
  seenUseCaseIds.add(id);

  if (!requiredUseCaseIds.includes(id)) {
    fail(`${label}.id is not listed in source-of-truth.requiredUseCaseIds: ${id}`);
  }

  if (useCase.specialty !== sourceOfTruth.specialty) {
    fail(`${label}.specialty must be "${sourceOfTruth.specialty}"`);
  }

  if (!isNonEmptyString(useCase.title)) {
    fail(`${label}.title must be a non-empty string`);
  }

  if (!allowedStatuses.has(useCase.status)) {
    fail(`${label}.status must be one of: ${Array.from(allowedStatuses).join(', ')}`);
  }

  statusCounter.set(useCase.status, (statusCounter.get(useCase.status) ?? 0) + 1);

  ensureStringArray(useCase.specFiles, `${label}.specFiles`).forEach((specPath, specIndex) => {
    assertFileExists(specPath, `${label}.specFiles[${specIndex}]`);
  });

  const endpoints = ensureStringArray(
    useCase?.contract?.backendEndpoints,
    `${label}.contract.backendEndpoints`,
  );
  endpoints.forEach((endpoint, endpointIndex) => {
    if (!parseEndpoint(endpoint)) {
      fail(`${label}.contract.backendEndpoints[${endpointIndex}] must follow "METHOD /api/..." format`);
    }
  });

  ensureStringArray(
    useCase?.contract?.implementationFiles,
    `${label}.contract.implementationFiles`,
  ).forEach((filePath, fileIndex) => {
    assertFileExists(filePath, `${label}.contract.implementationFiles[${fileIndex}]`);
  });

  const apiTests = ensureStringArray(
    useCase?.verification?.apiTests ?? [],
    `${label}.verification.apiTests`,
    0,
  );
  apiTests.forEach((filePath, fileIndex) => {
    assertFileExists(filePath, `${label}.verification.apiTests[${fileIndex}]`);
  });

  const appTests = ensureStringArray(
    useCase?.verification?.appTests ?? [],
    `${label}.verification.appTests`,
    0,
  );
  appTests.forEach((filePath, fileIndex) => {
    assertFileExists(filePath, `${label}.verification.appTests[${fileIndex}]`);
  });

  const ciChecks = ensureStringArray(
    useCase?.verification?.ciChecks ?? [],
    `${label}.verification.ciChecks`,
  );
  ciChecks.forEach((checkCommand, checkIndex) => {
    if (!checkCommand.startsWith('npm run ')) {
      fail(`${label}.verification.ciChecks[${checkIndex}] must start with "npm run "`);
    }
    ciChecksSeen.add(checkCommand);
  });

  if (useCase.status === 'implemented' && apiTests.length + appTests.length === 0) {
    fail(`${label} is implemented but has no automated test evidence`);
  }

  const gaps = ensureStringArray(useCase.gaps ?? [], `${label}.gaps`, 0);
  if (useCase.status !== 'implemented' && gaps.length === 0) {
    fail(`${label} must define at least one gap while status is "${useCase.status}"`);
  }
}

for (const requiredId of requiredUseCaseIds) {
  if (!seenUseCaseIds.has(requiredId)) {
    fail(`Required use case is missing from matrix: ${requiredId}`);
  }
}

for (const requiredCiCheck of requiredCiChecks) {
  if (!ciChecksSeen.has(requiredCiCheck)) {
    fail(`Required CI check command is not referenced in matrix: ${requiredCiCheck}`);
  }
}

if (errors.length > 0) {
  console.error('Spec contract validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Spec contract validation passed.');
console.log(`- use cases validated: ${seenUseCaseIds.size}`);
console.log(`- statuses: ${Array.from(statusCounter.entries()).map(([status, count]) => `${status}=${count}`).join(', ')}`);
console.log(`- matrix file: ${matrixRelativePath}`);
