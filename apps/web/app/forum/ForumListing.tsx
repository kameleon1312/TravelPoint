'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WorldNav } from '@/components/layout/WorldNav';
import { ForumAuthProvider, useForumAuth, SignInModal } from '@/components/forum/ForumAuth';
import { NewPostForm } from '@/components/forum/NewPostForm';

const API_URL = (process.env['NEXT_PUBLIC_API_URL'] ?? '').replace(/\/$/, '');

const CATEGORY_OPTIONS = [
  { value: '', label: 'Wszystkie' },
  { value: 'FIELD_NOTES', label: 'Notatki z terenu' },
  { value: 'GEAR', label: 'Sprzęt' },
  { value: 'SAFETY', label: 'Bezpieczeństwo' },
  { value: 'REQUESTS', label: 'Prośby' },
  { value: 'STORIES', label: 'Historie' },
];

interface ForumPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  category: string;
  isPinned: boolean;
  createdAt: string;
  author: { handle: string; displayName?: string | null; rank: string };
  _count?: { replies: number };
}

interface ForumResponse {
  posts: ForumPost[];
  total: number;
  page: number;
  pages: number;
}

function ForumListingInner(): ReactElement {
  const { token, signOut } = useForumAuth();
  const router = useRouter();
  const [data, setData] = useState<ForumResponse | null>(null);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);

  const load = useCallback(async (p: number, cat: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (cat) params.set('category', cat);
      const res = await fetch(`${API_URL}/api/forum/posts?${params}`, { next: { revalidate: 0 } });
      if (!res.ok) return;
      setData(await res.json() as ForumResponse);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(1, ''); }, [load]);

  function changeCategory(cat: string) {
    setCategory(cat);
    setPage(1);
    void load(1, cat);
  }

  function changePage(p: number) {
    setPage(p);
    void load(p, category);
  }

  function onCreated(slug: string) {
    setShowNewPost(false);
    router.push(`/forum/${slug}`);
  }

  const posts = data?.posts ?? [];

  return (
    <>
      <WorldNav />
      <main className="min-h-screen bg-abyss pt-28 pb-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow mb-4">Forum Odkrywców</p>
              <h1 className="font-display text-4xl md:text-6xl font-bold text-starlight tracking-tight leading-none mb-4">
                Głos społeczności
              </h1>
              <p className="font-sans text-base text-star max-w-2xl leading-relaxed">
                Pytania z trasy, ostrzeżenia, notatki terenowe i historie, które
                zasługują na drugą parę oczu.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {token ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowNewPost((v) => !v)}
                    className="rounded-full bg-aurora px-6 py-2.5 font-sans font-semibold text-void transition hover:opacity-90"
                  >
                    + Nowy wątek
                  </button>
                  <button
                    type="button"
                    onClick={signOut}
                    className="rounded-full border border-steel px-4 py-2.5 text-sm text-starFaint transition hover:border-starGhost"
                  >
                    Wyloguj
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSignIn(true)}
                  className="rounded-full border border-signal px-6 py-2.5 font-sans font-medium text-signal transition hover:bg-signal/10"
                >
                  Zaloguj się
                </button>
              )}
            </div>
          </div>

          {showNewPost && (
            <div className="mb-8">
              <NewPostForm onCreated={onCreated} onCancel={() => setShowNewPost(false)} />
            </div>
          )}

          {/* Category filter */}
          <div className="mb-6 flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => changeCategory(opt.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  category === opt.value
                    ? 'bg-aurora text-void'
                    : 'border border-steel text-star hover:border-starGhost'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {data && (
            <p className="mb-4 font-mono text-xs text-starGhost">
              {data.total} wątków · strona {data.page}/{data.pages}
            </p>
          )}

          {loading && (
            <div className="grid gap-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-3xl bg-graphite" />
              ))}
            </div>
          )}

          {!loading && posts.length === 0 && (
            <section className="rounded-3xl border border-steel bg-graphite p-8 md:p-10">
              <p className="font-mono text-xs uppercase tracking-widest text-starGhost mb-3">
                Brak wątków
              </p>
              <h2 className="font-display text-2xl font-bold text-starlight mb-3">
                {category ? 'Brak wątków w tej kategorii.' : 'Pierwsze wątki pojawią się wkrótce.'}
              </h2>
              {token && (
                <button
                  type="button"
                  onClick={() => setShowNewPost(true)}
                  className="mt-4 rounded-full bg-aurora px-6 py-2.5 font-sans font-semibold text-void"
                >
                  Dodaj pierwszy wątek
                </button>
              )}
            </section>
          )}

          {!loading && posts.length > 0 && (
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
                        {CATEGORY_OPTIONS.find((c) => c.value === post.category)?.label ?? post.category}
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

          {data && data.pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => changePage(page - 1)}
                className="rounded-full border border-steel px-5 py-2 text-sm text-star disabled:opacity-40"
              >
                ← Poprzednia
              </button>
              <span className="font-mono text-xs text-starGhost">{page} / {data.pages}</span>
              <button
                type="button"
                disabled={page >= data.pages}
                onClick={() => changePage(page + 1)}
                className="rounded-full border border-steel px-5 py-2 text-sm text-star disabled:opacity-40"
              >
                Następna →
              </button>
            </div>
          )}
        </div>
      </main>

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </>
  );
}

export function ForumListing(): ReactElement {
  return (
    <ForumAuthProvider>
      <ForumListingInner />
    </ForumAuthProvider>
  );
}
