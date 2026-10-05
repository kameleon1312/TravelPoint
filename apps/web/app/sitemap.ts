import type { MetadataRoute } from 'next';
import { JOURNAL_POSTS } from '@/lib/journal';

const BASE = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://travelpoint.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE}/map`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE}/forum`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.85,
    },
    {
      url: `${BASE}/journal`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE}/download`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${BASE}/join`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: `${BASE}/explorers`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${BASE}/regulamin`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE}/polityka-prywatnosci`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE}/rodo`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  const journalPages: MetadataRoute.Sitemap = JOURNAL_POSTS.map((post) => ({
    url: `${BASE}/journal/${post.slug}`,
    lastModified: new Date(post.publishedAt).toISOString(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...journalPages];
}
