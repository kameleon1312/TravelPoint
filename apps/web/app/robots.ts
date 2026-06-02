import type { MetadataRoute } from 'next';

const BASE = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://travelpoint.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/journal', '/journal/', '/map', '/explorer/'],
        disallow: ['/api/', '/rodo', '/regulamin', '/polityka-prywatnosci'],
      },
      // Block AI training scrapers
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'Google-Extended', 'CCBot', 'anthropic-ai'],
        disallow: ['/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
