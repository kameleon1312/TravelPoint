import type { Metadata } from 'next';
import Link from 'next/link';
import { WorldNav } from '@/components/layout/WorldNav';

export const metadata: Metadata = {
  title: 'Forum — TravelPoint',
  description: 'Publiczne dyskusje explorerów TravelPoint: field notes, gear, safety, prośby i historie z trasy.',
  openGraph: {
    title: 'Forum — TravelPoint',
    description: 'Głos społeczności TravelPoint: pytania, ostrzeżenia i historie z miejsc poza przewodnikami.',
    type: 'website',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  FIELD_NOTES: 'Field notes',
  GEAR: 'Gear',
  SAFETY: 'Safety',
  REQUESTS: 'Requests',
  STORIES: 'Stories',
};

interface ForumPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  category: string;
  isPinned: boolean;
  createdAt: string;
  author: {
    handle: string;
    displayName?: string | null;
    rank: string;
  };
  _count?: { replies: number };
}

export default async function ForumPage(): Promise<React.JSX.Element> {
  const posts = await getForumPosts();

  return (
    <>
      <WorldNav />
      <main className="min-h-screen bg-abyss pt-28 pb-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-14">
            <p className="eyebrow mb-4">World Forum</p>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-starlight tracking-tight leading-none mb-6">
              Głos społeczności
            </h1>
            <p className="font-sans text-base text-star max-w-2xl leading-relaxed">
              Pytania z trasy, ostrzeżenia, notatki terenowe i historie, które zasługują
              na drugą parę oczu zanim trafią do CORE.
            </p>
          </div>

          {posts.length === 0 ? (
            <section className="rounded-3xl border border-steel bg-graphite p-8 md:p-10">
              <p className="font-mono text-xs uppercase tracking-widest text-starGhost mb-3">
                Forum gotowe
              </p>
              <h2 className="font-display text-2xl font-bold text-starlight mb-3">
                Pierwsze wątki pojawią się po seedzie lub z aplikacji.
              </h2>
              <p className="font-sans text-sm text-star leading-relaxed max-w-xl">
                API forum jest już podłączone. Gdy explorerzy dodadzą posty, WORLD pokaże je tutaj
                bez dodatkowego deployu frontendu.
              </p>
            </section>
          ) : (
            <div className="grid gap-5">
              {posts.map((post) => (
                <Link key={post.id} href={`/forum/${post.slug}`} className="group">
                  <article className="rounded-3xl border border-steel bg-graphite p-6 md:p-7 transition-colors hover:border-starGhost">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      {post.isPinned && (
                        <span className="rounded-full border border-aurora/30 bg-aurora/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-aurora">
                          pinned
                        </span>
                      )}
                      <span className="font-mono text-xs uppercase tracking-widest text-signal">
                        {CATEGORY_LABELS[post.category] ?? post.category}
                      </span>
                      <span className="font-mono text-xs text-starGhost">
                        @{post.author.handle}
                      </span>
                      <span className="ml-auto font-mono text-xs text-starGhost">
                        {post._count?.replies ?? 0} odpowiedzi
                      </span>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-starlight group-hover:text-aurora transition-colors mb-3">
                      {post.title}
                    </h2>
                    <p className="font-sans text-sm text-star leading-relaxed line-clamp-2">
                      {post.body}
                    </p>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

async function getForumPosts(): Promise<ForumPost[]> {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'];
  if (!apiUrl) return [];
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/forum/posts`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    return await response.json() as ForumPost[];
  } catch {
    return [];
  }
}
