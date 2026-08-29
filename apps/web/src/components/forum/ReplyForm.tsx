'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';
import { apiFetch } from '@/lib/webAuth';

interface Reply {
  id: string;
  body: string;
  createdAt: string;
  author: { handle: string; displayName?: string | null; rank: string };
}

interface Props {
  postSlug: string;
  locked: boolean;
  onReplied: (reply: Reply) => void;
  onNeedAuth: () => void;
  hasToken: boolean;
}

export function ReplyForm({ postSlug, locked, onReplied, onNeedAuth, hasToken }: Props): ReactElement {
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasToken) { onNeedAuth(); return; }
    setLoading(true);
    setError('');
    try {
      const reply = await apiFetch<Reply>(`/api/forum/posts/${postSlug}/replies`, {
        method: 'POST',
        body: JSON.stringify({ body: body.trim() }),
      });
      setBody('');
      onReplied(reply);
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onNeedAuth();
      } else {
        setError(err instanceof Error ? err.message : 'Błąd wysyłania odpowiedzi');
      }
    } finally {
      setLoading(false);
    }
  }

  if (locked) {
    return (
      <div className="rounded-2xl border border-[#253035] bg-[#0C1014] px-5 py-4">
        <p className="font-mono text-xs uppercase tracking-widest text-[#5A5550]">
          Wątek zablokowany — nowe odpowiedzi są wyłączone
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="rounded-2xl border border-[#253035] bg-[#0C1014] p-5">
      <label className="mb-2 block text-xs uppercase tracking-wider text-[#5A5550]">
        Twoja odpowiedź
      </label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        className="mb-3 w-full resize-y rounded-xl border border-[#253035] bg-[#131A1F] px-4 py-3 text-sm text-[#EDE8DF] placeholder:text-[#5A5550] focus:border-[#5CB88C] focus:outline-none"
        placeholder={hasToken ? 'Napisz odpowiedź…' : 'Zaloguj się, żeby odpowiedzieć'}
        minLength={2}
        maxLength={3000}
        required
      />
      <div className="flex items-center justify-between gap-4">
        {error && <p className="text-sm text-[#C86840]">{error}</p>}
        <p className="text-right text-xs text-[#5A5550]">{body.length}/3000</p>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[#1E9AB0] px-6 py-2 font-sans font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? '…' : hasToken ? 'Odpowiedz' : 'Zaloguj się'}
        </button>
      </div>
    </form>
  );
}
