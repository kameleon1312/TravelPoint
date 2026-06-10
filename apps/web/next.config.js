// @ts-check
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep development output separate from production builds. This prevents
  // `next build` from invalidating chunks served by a running dev server.
  distDir: isDev ? '.next-dev' : '.next',
  transpilePackages: [
    '@travelpoint/theme',
    '@travelpoint/types',
    '@travelpoint/validation',
    '@travelpoint/api-client',
  ],
  experimental: {
    // mapbox-gl uses browser APIs — exclude from server-side bundling
    serverComponentsExternalPackages: ['mapbox-gl'],
  },
  webpack(config) {
    // Alias each workspace package to its TypeScript source so Next.js
    // transpiles them directly — no build step needed in dev.
    const pkgRoot = path.resolve(__dirname, '../../packages');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@travelpoint/theme':      path.join(pkgRoot, 'theme/src/index.ts'),
      '@travelpoint/types':      path.join(pkgRoot, 'types/src/index.ts'),
      '@travelpoint/validation': path.join(pkgRoot, 'validation/src/index.ts'),
      '@travelpoint/api-client': path.join(pkgRoot, 'api-client/src/index.ts'),
    };
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.travelpoint.io' },
      // Supabase Storage (photo uploads)
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
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
