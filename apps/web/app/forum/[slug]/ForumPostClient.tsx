'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { ForumAuthProvider, useForumAuth, SignInModal } from '@/components/forum/ForumAuth';
import { ReplyForm } from '@/components/forum/ReplyForm';
import { apiFetch } from '@/lib/webAuth';

interface Reply {
  id: string;
  body: string;
  createdAt: string;
  author: { handle: string; displayName?: string | null; rank: string };
}

interface Post {
  id: string;
  title: string;
  slug: string;
  body: string;
  category: string;
  isPinned: boolean;
  lockedAt?: string | null;
  createdAt: string;
  author: { handle: string; displayName?: string | null; rank: string };
  replies: Reply[];
}

const CATEGORY_LABELS: Record<string, string> = {
  FIELD_NOTES: 'Field Notes',
  GEAR: 'Gear',
  SAFETY: 'Safety',
  REQUESTS: 'Requests',
  STORIES: 'Stories',
};

function PostClientInner({ post: initial }: { post: Post }): ReactElement {
  const { token } = useForumAuth();
  const [post] = useState(initial);
  const [replies, setReplies] = useState<Reply[]>(initial.replies);
  const [showSignIn, setShowSignIn] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportError, setReportError] = useState('');

  function onReplied(reply: Reply) {
    setReplies((prev) => [...prev, reply]);
  }

  async function reportPost() {
    if (!token) { setShowSignIn(true); return; }
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ forumPostId: post.id, reason: 'OTHER' }),
      });
      setReportSent(true);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Błąd zgłoszenia');
    }
  }

  const locked = !!post.lockedAt;

  return (
    <>
      <main className="min-h-screen bg-abyss pt-28 pb-24 px-4">
        <article className="max-w-3xl mx-auto">
          <Link href="/forum" className="font-sans text-sm text-starFaint hover:text-aurora transition-colors">
            ← Forum
          </Link>

          <header className="mt-10 mb-10">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {post.isPinned && (
                <span className="rounded-full border border-aurora/30 bg-aurora/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-aurora">
                  pinned
                </span>
              )}
              {locked && (
                <span className="rounded-full border border-ember/30 bg-ember/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ember">
                  zablokowany
                </span>
              )}
              <p className="eyebrow">{CATEGORY_LABELS[post.category] ?? post.category}</p>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-starlight tracking-tight leading-tight mb-5">
              {post.title}
            </h1>
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-xs text-starGhost">
                @{post.author.handle} · {new Date(post.createdAt).toLocaleDateString('pl-PL')}
              </p>
              <div className="flex items-center gap-3">
                {reportSent ? (
                  <span className="font-mono text-xs text-aurora">Zgłoszono</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void reportPost()}
                    className="font-mono text-xs text-starGhost transition hover:text-ember"
                  >
                    Zgłoś
                  </button>
                )}
                {reportError && <span className="font-mono text-xs text-ember">{reportError}</span>}
              </div>
            </div>
          </header>

          <div className="rounded-3xl border border-steel bg-graphite p-7 md:p-9 mb-10">
            <p className="whitespace-pre-wrap font-sans text-base text-star leading-relaxed">
              {post.body}
            </p>
          </div>

          <section>
            <h2 className="font-display text-2xl font-bold text-starlight mb-6">
              Odpowiedzi ({replies.length})
            </h2>
            <div className="grid gap-4 mb-6">
              {replies.map((reply) => (
                <div key={reply.id} className="rounded-2xl border border-steel bg-midnight p-5">
                  <p className="font-mono text-xs text-starGhost mb-3">
                    @{reply.author.handle} · {new Date(reply.createdAt).toLocaleDateString('pl-PL')}
                  </p>
                  <p className="whitespace-pre-wrap font-sans text-sm text-star leading-relaxed">
                    {reply.body}
                  </p>
                </div>
              ))}
              {replies.length === 0 && (
                <p className="font-mono text-xs text-starGhost py-4">
                  Brak odpowiedzi. Bądź pierwszy.
                </p>
              )}
            </div>

            <ReplyForm
              postSlug={post.slug}
              locked={locked}
              onReplied={onReplied}
              onNeedAuth={() => setShowSignIn(true)}
              hasToken={!!token}
            />
          </section>
        </article>
      </main>

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </>
  );
}

export function ForumPostClient({ post }: { post: Post }): ReactElement {
  return (
    <ForumAuthProvider>
      <PostClientInner post={post} />
    </ForumAuthProvider>
  );
}
