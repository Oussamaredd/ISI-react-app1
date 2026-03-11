const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);
const forcedModulePaths = new Map([
  ["react", path.resolve(projectRoot, "node_modules/react/index.js")],
  ["react/compiler-runtime", path.resolve(projectRoot, "node_modules/react/compiler-runtime.js")],
  ["react/jsx-dev-runtime", path.resolve(projectRoot, "node_modules/react/jsx-dev-runtime.js")],
  ["react/jsx-runtime", path.resolve(projectRoot, "node_modules/react/jsx-runtime.js")],
  ["react-dom", path.resolve(projectRoot, "node_modules/react-dom/index.js")],
  ["react-native", path.resolve(projectRoot, "node_modules/react-native/index.js")]
]);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules")
];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const forcedPath = forcedModulePaths.get(moduleName);
  if (forcedPath) {
    return {
      filePath: forcedPath,
      type: "sourceFile"
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
