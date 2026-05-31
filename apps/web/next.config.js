/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  transpilePackages: ['@travelpoint/theme', '@travelpoint/types', '@travelpoint/validation', '@travelpoint/api-client'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.travelpoint.io',
      },
    ],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        // X-Frame-Options only in production — allows VS Code / browser previews in dev
        ...(!isDev ? [{ key: 'X-Frame-Options', value: 'DENY' }] : []),
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
};

module.exports = nextConfig;
