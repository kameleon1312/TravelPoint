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
// resolveRequest intercepts every import and forces react/react-native to always
// resolve to the same canonical real path from THIS app's node_modules.
config.resolver.resolveRequest = (context, moduleName, platform) => {
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
