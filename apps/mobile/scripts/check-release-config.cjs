const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const originalProfile = process.env.EAS_BUILD_PROFILE;
const originalMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;

try {
  process.env.EAS_BUILD_PROFILE = 'production';
  process.env.EXPO_PUBLIC_API_URL = 'https://api.travelpoint.app';
  delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  assert.throws(
    () => require('../app.config.js')(),
    /EXPO_PUBLIC_GOOGLE_MAPS_API_KEY/,
  );

  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = `AIza${'A'.repeat(35)}`;
  const config = require('../app.config.js')();
  assert.equal(
    config.android.config.googleMaps.apiKey,
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  );
  assertAssetExists(config.icon);
  assertAssetExists(config.splash.image);
  assertAssetExists(config.android.adaptiveIcon.foregroundImage);
  assertAssetExists(config.web.favicon);

  const notificationsPlugin = config.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-notifications',
  );
  assert.ok(notificationsPlugin, 'expo-notifications plugin is required');
  assertAssetExists(notificationsPlugin[1].icon);
  assertWorkspacePackagesResolvable();
  assertSentryUploadDoesNotBlockBuilds();

  process.env.EXPO_PUBLIC_API_URL = 'http://api.travelpoint.app';
  assert.throws(
    () => require('../app.config.js')(),
    /EXPO_PUBLIC_API_URL must be an HTTPS URL/,
  );

  console.log('Release config validation passed');
} finally {
  restore('EAS_BUILD_PROFILE', originalProfile);
  restore('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY', originalMapsKey);
  restore('EXPO_PUBLIC_API_URL', originalApiUrl);
}

function restore(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function assertAssetExists(relativePath) {
  const absolutePath = path.resolve(__dirname, '..', relativePath);
  assert.ok(
    fs.existsSync(absolutePath),
    `Configured asset does not exist: ${relativePath}`,
  );
}

function assertWorkspacePackagesResolvable() {
  const mobilePackage = require('../package.json');
  const dependencies = Object.keys(mobilePackage.dependencies ?? {}).filter(
    (name) => name.startsWith('@travelpoint/'),
  );

  for (const dependency of dependencies) {
    const packageDirectory = dependency.slice('@travelpoint/'.length);
    const packageRoot = path.resolve(
      __dirname,
      '../../..',
      'packages',
      packageDirectory,
    );
    const packageJson = require(path.join(packageRoot, 'package.json'));
    const rootExport = packageJson.exports?.['.'];
    const reactNativeEntry =
      typeof rootExport === 'string'
        ? rootExport
        : rootExport?.['react-native'] ?? packageJson['react-native'];

    assert.ok(
      reactNativeEntry,
      `${dependency} must expose a React Native source entry.`,
    );
    assert.ok(
      fs.existsSync(path.resolve(packageRoot, reactNativeEntry)),
      `${dependency} React Native entry does not exist: ${reactNativeEntry}`,
    );
  }
}

function assertSentryUploadDoesNotBlockBuilds() {
  const easConfig = require('../eas.json');

  for (const [profile, config] of Object.entries(easConfig.build ?? {})) {
    assert.equal(
      config.env?.SENTRY_DISABLE_AUTO_UPLOAD,
      'true',
      `${profile} must disable Sentry source map upload during EAS builds.`,
    );
  }
}
