import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WorldNav } from '@/components/layout/WorldNav';

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
    },
  };
}

export default async function ForumPostPage({ params }: Props): Promise<React.JSX.Element> {
  const { slug } = await params;
  const post = await getForumPost(slug);
  if (!post) notFound();

  return (
    <>
      <WorldNav />
      <main className="min-h-screen bg-abyss pt-28 pb-24 px-4">
        <article className="max-w-3xl mx-auto">
          <Link href="/forum" className="font-sans text-sm text-starFaint hover:text-aurora transition-colors">
            ← Forum
          </Link>

          <header className="mt-10 mb-10">
            <p className="eyebrow mb-4">{post.category.replace('_', ' ')}</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-starlight tracking-tight leading-tight mb-5">
              {post.title}
            </h1>
            <p className="font-mono text-xs text-starGhost">
              @{post.author.handle} · {new Date(post.createdAt).toLocaleDateString('pl-PL')}
            </p>
          </header>

          <div className="rounded-3xl border border-steel bg-graphite p-7 md:p-9">
            <p className="whitespace-pre-wrap font-sans text-base text-star leading-relaxed">
              {post.body}
            </p>
          </div>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-bold text-starlight mb-5">
              Odpowiedzi ({post.replies.length})
            </h2>
            <div className="grid gap-4">
              {post.replies.map((reply) => (
                <div key={reply.id} className="rounded-2xl border border-steel bg-midnight p-5">
                  <p className="font-mono text-xs text-starGhost mb-3">
                    @{reply.author.handle} · {new Date(reply.createdAt).toLocaleDateString('pl-PL')}
                  </p>
                  <p className="whitespace-pre-wrap font-sans text-sm text-star leading-relaxed">
                    {reply.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </article>
      </main>
    </>
  );
}

async function getForumPost(slug: string): Promise<ForumPost | null> {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'];
  if (!apiUrl) return null;
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/forum/posts/${slug}`, {
      next: { revalidate: 60 },
    });
    if (response.status === 404) return null;
    if (!response.ok) return null;
    return await response.json() as ForumPost;
  } catch {
    return null;
  }
}
