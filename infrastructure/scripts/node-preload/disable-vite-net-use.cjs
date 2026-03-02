const childProcess = require('node:child_process');
const { EventEmitter } = require('node:events');
const { syncBuiltinESMExports } = require('node:module');
const path = require('node:path');

const NET_USE_COMMAND = 'net use';
const shouldPatch =
  process.platform === 'win32' && process.env.ECOTRACK_ALLOW_VITE_NET_USE !== '1';
const ESBUILD_PACKAGE_BY_ARCH = {
  arm64: '@esbuild/win32-arm64',
  ia32: '@esbuild/win32-ia32',
  x64: '@esbuild/win32-x64',
};

function detectSpawnRestriction() {
  const esbuildPackageName = ESBUILD_PACKAGE_BY_ARCH[process.arch];
  if (!esbuildPackageName) {
    return false;
  }

  try {
    const esbuildVersion = require('esbuild').version;
    const esbuildPackageRoot = path.dirname(require.resolve(`${esbuildPackageName}/package.json`));
    const esbuildBinaryPath = path.join(esbuildPackageRoot, 'esbuild.exe');
    const child = childProcess.spawn(esbuildBinaryPath, [`--service=${esbuildVersion}`, '--ping'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    child.on('error', () => {});
    child.kill();
    return false;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

if (detectSpawnRestriction()) {
  process.env.ECOTRACK_VITE_SPAWN_RESTRICTED = '1';

  const esbuild = require('esbuild');
  if (!esbuild.__ecotrackTransformPatched && typeof esbuild.transformSync === 'function') {
    const originalTransformSync = esbuild.transformSync.bind(esbuild);
    esbuild.transform = async (input, options) => originalTransformSync(input, options);
    Object.defineProperty(esbuild, '__ecotrackTransformPatched', {
      configurable: false,
      enumerable: false,
      value: true,
      writable: false,
    });
  }
}

if (shouldPatch) {
  const originalExec = childProcess.exec;

  childProcess.exec = function patchedExec(command, options, callback) {
    const normalizedCommand = typeof command === 'string' ? command.trim().toLowerCase() : '';

    if (normalizedCommand !== NET_USE_COMMAND) {
      return originalExec.call(this, command, options, callback);
    }

    const resolvedCallback =
      typeof options === 'function' ? options : typeof callback === 'function' ? callback : null;

    if (resolvedCallback) {
      process.nextTick(() => resolvedCallback(null, '', ''));
    }

    const fakeChild = new EventEmitter();
    fakeChild.pid = undefined;
    fakeChild.killed = false;
    fakeChild.stdin = null;
    fakeChild.stdout = null;
    fakeChild.stderr = null;
    fakeChild.kill = () => false;

    return fakeChild;
  };

  syncBuiltinESMExports();
}
