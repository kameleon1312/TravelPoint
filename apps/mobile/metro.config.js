const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// pnpm uses symlinks. Metro can bundle the same package twice when it resolves
// it through both the symlink path AND the real pnpm-store path.
// resolveRequest intercepts every import and:
//   1. Maps @travelpoint/* to their TS source directly (no build step needed)
//   2. Forces react/react-native to the canonical real path from THIS app's node_modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Route workspace packages to TypeScript source — avoids needing a build step
  if (moduleName.startsWith('@travelpoint/')) {
    const pkgName = moduleName.slice('@travelpoint/'.length);
    const srcEntry = path.resolve(workspaceRoot, `packages/${pkgName}/src/index.ts`);
    if (fs.existsSync(srcEntry)) {
      return { filePath: srcEntry, type: 'sourceFile' };
    }
  }

  const isReact = moduleName === 'react' ||
                  moduleName === 'react-native' ||
                  moduleName.startsWith('react/') ||
                  moduleName.startsWith('react-native/');
  if (isReact) {
    try {
      const resolved = require.resolve(moduleName, { paths: [projectRoot] });
      return { filePath: fs.realpathSync(resolved), type: 'sourceFile' };
    } catch (_) {}
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
