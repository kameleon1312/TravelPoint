'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';
import { useForumAuth } from './ForumAuth';
import { apiFetch } from '@/lib/webAuth';

const CATEGORIES = [
  { value: 'FIELD_NOTES', label: 'Field Notes' },
  { value: 'GEAR', label: 'Gear' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'REQUESTS', label: 'Requests' },
  { value: 'STORIES', label: 'Stories' },
] as const;

interface Props {
  onCreated: (slug: string) => void;
  onCancel: () => void;
}

export function NewPostForm({ onCreated, onCancel }: Props): ReactElement {
  const { token } = useForumAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string>('FIELD_NOTES');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const post = await apiFetch<{ slug: string }>('/api/forum/posts', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), body: body.trim(), category }),
      });
      onCreated(post.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd tworzenia posta');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-[#253035] bg-[#131A1F] px-4 py-3 text-sm text-[#EDE8DF] placeholder:text-[#5A5550] focus:border-[#5CB88C] focus:outline-none';

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="rounded-3xl border border-[#1E9AB0] bg-[#0C1014] p-6 md:p-8"
    >
      <h2 className="mb-6 font-display text-2xl font-bold text-[#EDE8DF]">
        Nowy wątek
      </h2>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-[#5A5550]">Kategoria</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-[#5A5550]">Tytuł (6–120 znaków)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="Co chcesz omówić?"
            minLength={6}
            maxLength={120}
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-[#5A5550]">Treść (20–5000 znaków)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`${inputClass} resize-y`}
            rows={6}
            placeholder="Opisz sytuację, zadaj pytanie lub podziel się historią…"
            minLength={20}
            maxLength={5000}
            required
          />
          <p className="mt-1 text-right text-xs text-[#5A5550]">{body.length}/5000</p>
        </div>
        {error && <p className="text-sm text-[#C86840]">{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[#5CB88C] px-7 py-2.5 font-sans font-semibold text-[#070A0C] transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Wysyłanie…' : 'Opublikuj'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[#253035] px-7 py-2.5 font-sans font-medium text-[#C4B9AC] transition hover:border-[#5CB88C]"
          >
            Anuluj
          </button>
        </div>
      </div>
    </form>
  );
}
