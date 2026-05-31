/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@travelpoint/theme', '@travelpoint/types', '@travelpoint/validation', '@travelpoint/api-client'],
  images: {
    domains: ['cdn.travelpoint.io'],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
};

module.exports = nextConfig;
