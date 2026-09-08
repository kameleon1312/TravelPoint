'use client';

import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  FIELD_NOTES: 'Notatki z terenu',
  GEAR: 'Sprzęt',
  SAFETY: 'Bezpieczeństwo',
  REQUESTS: 'Prośby',
  STORIES: 'Historie',
};

function PostClientInner({ post: initial }: { post: Post }): ReactElement {
  const { token } = useForumAuth();
  const router = useRouter();
  const [post, setPost] = useState(initial);
  const [replies, setReplies] = useState<Reply[]>(initial.replies);
  const [showSignIn, setShowSignIn] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportError, setReportError] = useState('');
  const [isModerator, setIsModerator] = useState(false);
  const [myHandle, setMyHandle] = useState('');
  const [modWorking, setModWorking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);

  const isAuthor = !!myHandle && myHandle === post.author.handle;

  useEffect(() => {
    if (!token) { setIsModerator(false); setMyHandle(''); return; }
    void apiFetch<{ role?: string; handle?: string }>('/api/explorers/me')
      .then((me) => {
        setIsModerator(me.role === 'MODERATOR' || me.role === 'ADMIN');
        setMyHandle(me.handle ?? '');
      })
      .catch(() => { setIsModerator(false); setMyHandle(''); });
  }, [token]);

  async function deletePost() {
    if (!confirm(`Usunąć post "${post.title}"? Tej operacji nie można cofnąć.`)) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/forum/posts/${post.slug}`, { method: 'DELETE' });
      router.push('/forum');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Nie udało się usunąć posta.');
      setDeleting(false);
    }
  }

  async function deleteReply(replyId: string) {
    if (!confirm('Usunąć tę odpowiedź?')) return;
    setDeletingReplyId(replyId);
    try {
      await apiFetch(`/api/forum/replies/${replyId}`, { method: 'DELETE' });
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Nie udało się usunąć odpowiedzi.');
    } finally {
      setDeletingReplyId(null);
    }
  }

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

  async function toggleLock() {
    setModWorking(true);
    try {
      await apiFetch(`/api/admin/forum/posts/${post.slug}/lock`, {
        method: 'PATCH',
        body: JSON.stringify({ locked: !post.lockedAt }),
      });
      setPost((p) => ({ ...p, lockedAt: p.lockedAt ? null : new Date().toISOString() }));
    } catch {
      // swallow — error visible via no state change
    } finally {
      setModWorking(false);
    }
  }

  async function togglePin() {
    setModWorking(true);
    try {
      await apiFetch(`/api/admin/forum/posts/${post.slug}/pin`, {
        method: 'PATCH',
        body: JSON.stringify({ pinned: !post.isPinned }),
      });
      setPost((p) => ({ ...p, isPinned: !p.isPinned }));
    } catch {
      // swallow
    } finally {
      setModWorking(false);
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
                  przypięty
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
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="font-mono text-xs text-starGhost">
                @{post.author.handle} · {new Date(post.createdAt).toLocaleDateString('pl-PL')}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Author delete */}
                {(isAuthor || isModerator) && (
                  <div className="flex items-center gap-2 border-r border-steel pr-3">
                    <button
                      type="button"
                      onClick={() => void deletePost()}
                      disabled={deleting}
                      className="font-mono text-[10px] uppercase tracking-wider text-ember hover:text-starlight transition disabled:opacity-40 border border-ember/40 rounded-full px-2.5 py-1"
                    >
                      {deleting ? '…' : 'Usuń post'}
                    </button>
                  </div>
                )}
                {/* Moderator controls */}
                {isModerator && (
                  <div className="flex items-center gap-2 border-r border-steel pr-3">
                    <button
                      type="button"
                      onClick={() => void toggleLock()}
                      disabled={modWorking}
                      className="font-mono text-[10px] uppercase tracking-wider text-signal hover:text-starlight transition disabled:opacity-40 border border-signal/40 rounded-full px-2.5 py-1"
                    >
                      {locked ? 'Odblokuj' : 'Zablokuj'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void togglePin()}
                      disabled={modWorking}
                      className="font-mono text-[10px] uppercase tracking-wider text-violet hover:text-starlight transition disabled:opacity-40 border border-violet/40 rounded-full px-2.5 py-1"
                    >
                      {post.isPinned ? 'Odepnij' : 'Przypnij'}
                    </button>
                  </div>
                )}
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
              {replies.map((reply) => {
                const isReplyAuthor = !!myHandle && myHandle === reply.author.handle;
                return (
                  <div key={reply.id} className="rounded-2xl border border-steel bg-midnight p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-mono text-xs text-starGhost">
                        @{reply.author.handle} · {new Date(reply.createdAt).toLocaleDateString('pl-PL')}
                      </p>
                      {(isReplyAuthor || isModerator) && (
                        <button
                          type="button"
                          onClick={() => void deleteReply(reply.id)}
                          disabled={deletingReplyId === reply.id}
                          className="font-mono text-[10px] uppercase tracking-wider text-ember/60 hover:text-ember transition disabled:opacity-40"
                        >
                          {deletingReplyId === reply.id ? '…' : 'Usuń'}
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap font-sans text-sm text-star leading-relaxed">
                      {reply.body}
                    </p>
                  </div>
                );
              })}
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
