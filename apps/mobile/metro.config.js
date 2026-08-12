const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Expose monorepo packages (theme, types, validation, etc.) to Metro watcher
config.watchFolders = [monorepoRoot];

// pnpm stores packages at the root virtual store — add both lookup paths
// so Metro resolves react-native, react, etc. to a single instance
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// @expo/metro-runtime messageSocket calls createWebSocketConnection() synchronously
// at module evaluation time. In RN 0.81 New Architecture, guardedLoadModule treats
// errors during module init as fatal before the JS runtime is ready — bypassing the
// try/catch in the original file. Replace with a no-op to prevent [runtime not ready] crash.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === './messageSocket' &&
    context.originModulePath.includes('@expo/metro-runtime')
  ) {
    return {
      filePath: path.resolve(projectRoot, 'patches/messageSocket.native.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
