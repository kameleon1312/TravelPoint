// @ts-check
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: isDev ? '.next-dev' : '.next',
  experimental: {
    // false = combine CSS per-entry-point (Next 14 behaviour).
    // Avoids the "preloaded but not used" browser warning caused by Next 15's
    // default 'strict' mode which splits CSS into per-segment chunks that can
    // arrive after the browser's preload timeout.
    cssChunking: false,
  },
  // Tell Next.js the monorepo root so it doesn't mistake a stale package-lock.json
  // in the user's home directory for the workspace root.
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  transpilePackages: [
    '@travelpoint/theme',
    '@travelpoint/types',
    '@travelpoint/validation',
    '@travelpoint/api-client',
  ],
  // mapbox-gl uses browser APIs — exclude from server-side bundling
  serverExternalPackages: ['mapbox-gl'],
  webpack(config) {
    const pkgRoot = path.resolve(__dirname, '../../packages');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@travelpoint/theme':      path.join(pkgRoot, 'theme/src/index.ts'),
      '@travelpoint/types':      path.join(pkgRoot, 'types/src/index.ts'),
      '@travelpoint/validation': path.join(pkgRoot, 'validation/src/index.ts'),
      '@travelpoint/api-client': path.join(pkgRoot, 'api-client/src/index.ts'),
    };
    // @sentry/nextjs + @opentelemetry/instrumentation use dynamic require() internally.
    // Webpack can't statically analyse them and emits "Critical dependency" warnings
    // that are harmless — suppress them to keep the terminal clean.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /@opentelemetry\/instrumentation/ },
      { module: /require-in-the-middle/ },
    ];
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.travelpoint.io' },
      // Supabase Storage (photo uploads)
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // In dev, proxy /render-api/* to the Render API so the browser never
  // makes a cross-origin request (avoids CORS issues with localhost).
  rewrites: async () => {
    if (!isDev) return [];
    return [
      {
        source: '/render-api/:path*',
        destination: 'https://travelpointdemo.onrender.com/:path*',
      },
    ];
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        ...(!isDev ? [{ key: 'X-Frame-Options', value: 'DENY' }] : []),
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=(self)' },
        ...(!isDev ? [{
          key:   'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload',
        }] : []),
      ],
    },
  ],
};

// Apply Sentry webpack plugin only when SENTRY_AUTH_TOKEN is present.
// This way local dev (no Sentry account needed) stays fast and unaffected.
if (process.env['SENTRY_AUTH_TOKEN']) {
  const { withSentryConfig } = require('@sentry/nextjs');
  module.exports = withSentryConfig(nextConfig, {
    org:       process.env['SENTRY_ORG'],
    project:   process.env['SENTRY_PROJECT'],
    authToken: process.env['SENTRY_AUTH_TOKEN'],
    silent:              true,
    disableLogger:       true,
    widenClientFileUpload: true,
    hideSourceMaps:      true,
    transpileClientSDK:  true,
  });
} else {
  module.exports = nextConfig;
}
