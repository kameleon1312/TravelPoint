import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { WorldNav } from '@/components/layout/WorldNav';
import { serializeJsonLd } from '@/lib/jsonLd';
import { ForumPostClient } from './ForumPostClient';

interface ForumReply {
  id: string;
  body: string;
  createdAt: string;
  author: { handle: string; displayName?: string | null; rank: string };
}

interface ForumPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  category: string;
  isPinned: boolean;
  lockedAt?: string | null;
  createdAt: string;
  author: { handle: string; displayName?: string | null; rank: string };
  replies: ForumReply[];
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getForumPost(slug);
  if (!post) return { title: 'Forum — TravelPoint' };
  return {
    title: `${post.title} — Forum`,
    description: post.body.slice(0, 160),
    openGraph: {
      title: post.title,
      description: post.body.slice(0, 160),
      type: 'article',
      authors: [`@${post.author.handle}`],
    },
  };
}

export default async function ForumPostPage({ params }: Props): Promise<React.JSX.Element> {
  const { slug } = await params;
  const post = await getForumPost(slug);
  if (!post) notFound();

  const appUrl = (process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://travelpoint.app').replace(/\/$/, '');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: post.title,
    text: post.body.slice(0, 500),
    url: `${appUrl}/forum/${post.slug}`,
    datePublished: post.createdAt,
    author: {
      '@type': 'Person',
      name: post.author.displayName ?? `@${post.author.handle}`,
      alternateName: `@${post.author.handle}`,
    },
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/ReplyAction',
      userInteractionCount: post.replies.length,
    },
  };

  return (
    <>
      <WorldNav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ForumPostClient post={post} />
    </>
  );
}

async function getForumPost(slug: string): Promise<ForumPost | null> {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'];
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/forum/posts/${slug}`, {
      next: { revalidate: 30 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return await res.json() as ForumPost;
  } catch {
    return null;
  }
}
