import type { JournalPost } from './journal';
import { JOURNAL_POSTS } from './journal';

interface ApiJournalPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyMdx: string;
  coverImage: string | null;
  authorName: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
}

// Accent colors cycled for DB posts that lack accentColor
const ACCENT_CYCLE = ['#5CB88C', '#1E9AB0', '#C86840', '#7A6D9E', '#C8A456'];

function mapApiPost(p: ApiJournalPost, index: number): JournalPost {
  const wordCount = p.bodyMdx.trim().split(/\s+/).length;
  return {
    slug: p.slug,
    title: p.title,
    subtitle: '',
    excerpt: p.excerpt,
    author: { handle: p.authorName, rank: 'EXPLORER' },
    publishedAt: p.publishedAt ?? p.createdAt,
    readingMinutes: Math.max(1, Math.round(wordCount / 200)),
    category: 'ROUTE',
    terrain: '',
    accentColor: ACCENT_CYCLE[index % ACCENT_CYCLE.length] ?? '#5CB88C',
    content: p.bodyMdx,
  };
}

const API_URL = (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000').replace(/\/$/, '');

export async function fetchJournalPosts(): Promise<JournalPost[]> {
  try {
    const res = await fetch(`${API_URL}/api/journal/posts`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const posts = (await res.json()) as ApiJournalPost[];
    if (posts.length > 0) return posts.map((p, i) => mapApiPost(p, i));
  } catch {
    // fallthrough — API unavailable or empty
  }
  return JOURNAL_POSTS;
}

export async function fetchJournalPost(slug: string): Promise<JournalPost | undefined> {
  try {
    const res = await fetch(`${API_URL}/api/journal/posts/${slug}`, {
      next: { revalidate: 300 },
    });
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`API ${res.status}`);
    const post = (await res.json()) as ApiJournalPost;
    return mapApiPost(post, 0);
  } catch {
    // fallthrough — return static post if it exists
  }
  return JOURNAL_POSTS.find((p) => p.slug === slug);
}
