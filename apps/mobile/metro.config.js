const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// @expo/metro-runtime calls createWebSocketConnection() synchronously at module
// evaluation time. In RN 0.81 New Architecture, guardedLoadModule treats errors
// during module init as fatal before the JS runtime signals readiness — bypassing
// the try/catch in the original file. Replace with a no-op stub.
const stubPath = path.resolve(projectRoot, 'patches', 'messageSocket.native.js');
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Normalize to forward slashes so the check works on Windows too
  const originNormalized = context.originModulePath.replace(/\\/g, '/');
  if (
    moduleName === './messageSocket' &&
    originNormalized.includes('@expo/metro-runtime')
  ) {
    return { filePath: stubPath, type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
