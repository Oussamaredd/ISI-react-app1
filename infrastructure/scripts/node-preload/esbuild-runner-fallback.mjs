import fs from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..", "..", "..");
const workspaceNames = ["app", "mobile", "api", "database"];
const workspaceHint = workspaceNames.find((workspaceName) => {
  const marker = `${path.sep}${workspaceName}${path.sep}`;
  const argvEntry = process.argv[1] ?? "";
  const cwd = process.cwd();

  return (
    argvEntry.includes(marker) ||
    cwd === path.join(repoRoot, workspaceName) ||
    cwd.includes(marker)
  );
});
const resolutionPackageJsonPaths = [];
const pushResolutionCandidate = (packageJsonPath) => {
  if (fs.existsSync(packageJsonPath) && !resolutionPackageJsonPaths.includes(packageJsonPath)) {
    resolutionPackageJsonPaths.push(packageJsonPath);
  }
};

if (workspaceHint) {
  pushResolutionCandidate(path.join(repoRoot, workspaceHint, "package.json"));
}

pushResolutionCandidate(path.join(repoRoot, "package.json"));

for (const workspaceName of workspaceNames) {
  pushResolutionCandidate(path.join(repoRoot, workspaceName, "package.json"));
}

const resolutionRequires = resolutionPackageJsonPaths.map((packageJsonPath) => createRequire(packageJsonPath));

const resolvePackageJson = (specifier) => {
  for (const requireFromCandidate of resolutionRequires) {
    try {
      const resolvedPath = requireFromCandidate.resolve(specifier);
      return requireFromCandidate(resolvedPath);
    } catch {
      // Keep trying the next candidate.
    }
  }

  return null;
};

const esbuildPackageJson = resolvePackageJson("esbuild/package.json");
const version = esbuildPackageJson?.version ?? "0.0.0-fallback";
const tsconfigOptionsCache = new Map();

function normalizeSourcefile(sourcefile) {
  if (typeof sourcefile !== "string" || sourcefile.length === 0) {
    return "";
  }

  return sourcefile.split("?")[0].split("#")[0];
}

function resolveTsconfigOptions(sourcefile) {
  const normalizedSourcefile = normalizeSourcefile(sourcefile);
  if (
    normalizedSourcefile.length === 0 ||
    normalizedSourcefile.startsWith("virtual.") ||
    normalizedSourcefile.startsWith("\0")
  ) {
    return {};
  }

  const absoluteSourcefile = path.isAbsolute(normalizedSourcefile)
    ? normalizedSourcefile
    : path.resolve(process.cwd(), normalizedSourcefile);
  const searchDirectory = path.dirname(absoluteSourcefile);
  const configPath = ts.findConfigFile(searchDirectory, ts.sys.fileExists, "tsconfig.json");

  if (!configPath) {
    return {};
  }

  if (tsconfigOptionsCache.has(configPath)) {
    return tsconfigOptionsCache.get(configPath);
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    tsconfigOptionsCache.set(configPath, {});
    return {};
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
    undefined,
    configPath,
  );

  const compilerOptions = parsedConfig.options ?? {};
  tsconfigOptionsCache.set(configPath, compilerOptions);
  return compilerOptions;
}

function resolveLoader(sourcefile, options = {}) {
  if (typeof options.loader === "string" && options.loader.length > 0) {
    return options.loader;
  }

  const extension = path.extname(normalizeSourcefile(sourcefile)).toLowerCase();
  switch (extension) {
    case ".tsx":
      return "tsx";
    case ".jsx":
      return "jsx";
    case ".ts":
    case ".mts":
    case ".cts":
      return "ts";
    default:
      return "js";
  }
}

function resolveTarget(target) {
  if (typeof target === "number") {
    return target;
  }

  const normalized = Array.isArray(target) ? target[0] : target;
  switch (normalized) {
    case "es2015":
      return ts.ScriptTarget.ES2015;
    case "es2016":
      return ts.ScriptTarget.ES2016;
    case "es2017":
      return ts.ScriptTarget.ES2017;
    case "es2018":
      return ts.ScriptTarget.ES2018;
    case "es2019":
      return ts.ScriptTarget.ES2019;
    case "es2020":
      return ts.ScriptTarget.ES2020;
    case "es2021":
      return ts.ScriptTarget.ES2021;
    case "es2022":
      return ts.ScriptTarget.ES2022;
    case "es2023":
      return ts.ScriptTarget.ES2023;
    default:
      return ts.ScriptTarget.ESNext;
  }
}

function resolveJsxMode(loader, options = {}) {
  if (loader !== "tsx" && loader !== "jsx") {
    return undefined;
  }

  if (options.jsx === "preserve") {
    return ts.JsxEmit.Preserve;
  }

  if (options.jsxFactory || options.jsxFragment) {
    return ts.JsxEmit.React;
  }

  return options.jsxDev ? ts.JsxEmit.ReactJSXDev : ts.JsxEmit.ReactJSX;
}

function resolveCompilerOptions(sourcefile, options = {}) {
  const loader = resolveLoader(sourcefile, options);
  const sourcemap = options.sourcemap;
  const inlineSourceMap = sourcemap === "inline";
  const tsconfigOptions = resolveTsconfigOptions(sourcefile);
  const jsx = resolveJsxMode(loader, options);

  return {
    ...tsconfigOptions,
    allowJs: true,
    emitDecoratorMetadata: tsconfigOptions.emitDecoratorMetadata ?? true,
    experimentalDecorators: tsconfigOptions.experimentalDecorators ?? true,
    inlineSourceMap,
    inlineSources: inlineSourceMap,
    jsx: jsx ?? tsconfigOptions.jsx,
    jsxFactory: options.jsxFactory,
    jsxFragmentFactory: options.jsxFragment,
    module: tsconfigOptions.module ?? ts.ModuleKind.ESNext,
    sourceMap: Boolean(sourcemap && sourcemap !== "inline"),
    target: resolveTarget(options.target ?? tsconfigOptions.target),
    useDefineForClassFields: tsconfigOptions.useDefineForClassFields ?? false,
  };
}

function normalizeMap(sourceMapText) {
  if (!sourceMapText) {
    return "";
  }

  return sourceMapText;
}

function createUnsupportedBuildError() {
  return new Error(
    "esbuild build() is unavailable in spawn-restricted mode; dependency pre-bundling must remain disabled.",
  );
}

function transformInternal(input, options = {}) {
  const sourcefile =
    normalizeSourcefile(options.sourcefile || options.sourceFile) ||
    `virtual.${resolveLoader("", options)}`;
  const compilerOptions = resolveCompilerOptions(sourcefile, options);
  const loader = resolveLoader(sourcefile, options);
  const appendTsxSuffix =
    loader === "tsx" &&
    !sourcefile.toLowerCase().endsWith(".tsx") &&
    !sourcefile.toLowerCase().endsWith(".jsx");
  const fileName = appendTsxSuffix ? `${sourcefile}.tsx` : sourcefile;
  const transpiled = ts.transpileModule(String(input), {
    compilerOptions,
    fileName,
    reportDiagnostics: false,
  });

  return {
    code: transpiled.outputText,
    map: normalizeMap(transpiled.sourceMapText),
    warnings: [],
  };
}

export { version };

export async function transform(input, options = {}) {
  return transformInternal(input, options);
}

export function transformSync(input, options = {}) {
  return transformInternal(input, options);
}

export async function formatMessages(messages = []) {
  return messages.map((message) => {
    if (typeof message === "string") {
      return message;
    }

    if (message && typeof message.text === "string") {
      return message.text;
    }

    return String(message);
  });
}

export function formatMessagesSync(messages = []) {
  return messages.map((message) => {
    if (typeof message === "string") {
      return message;
    }

    if (message && typeof message.text === "string") {
      return message.text;
    }

    return String(message);
  });
}

export async function build() {
  throw createUnsupportedBuildError();
}

export function buildSync() {
  throw createUnsupportedBuildError();
}

const fallbackEsbuild = {
  build,
  buildSync,
  formatMessages,
  formatMessagesSync,
  transform,
  transformSync,
  version,
};

export default fallbackEsbuild;
