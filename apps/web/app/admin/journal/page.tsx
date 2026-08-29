'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ReactElement } from 'react';

interface JournalPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage?: string | null;
  authorName: string;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
}

interface FormState {
  slug: string;
  title: string;
  excerpt: string;
  bodyMdx: string;
  coverImage: string;
  authorName: string;
  status: 'DRAFT' | 'PUBLISHED';
}

const EMPTY_FORM: FormState = {
  slug: '', title: '', excerpt: '', bodyMdx: '', coverImage: '', authorName: '', status: 'DRAFT',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function AdminJournalPage(): ReactElement {
  const [token, setToken] = useState('');
  const [posts, setPosts] = useState<JournalPost[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  const apiFetch = useCallback(async (path: string, init?: RequestInit) => {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
      throw new Error(err.message ?? `API ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }, [token]);

  const loadPosts = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/api/journal/posts') as JournalPost[];
      setPosts(data);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Błąd pobierania postów');
    }
  }, [token, apiFetch]);

  useEffect(() => { void loadPosts(); }, [loadPosts]);

  function startEdit(post: JournalPost) {
    setEditingId(post.id);
    setForm({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      bodyMdx: '',
      coverImage: post.coverImage ?? '',
      authorName: post.authorName,
      status: post.status,
    });
    setShowForm(true);
    setSuccess('');
    setError('');
  }

  function startNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setSuccess('');
    setError('');
  }

  async function submit() {
    try {
      setError('');
      const body = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        bodyMdx: form.bodyMdx.trim(),
        coverImage: form.coverImage.trim() || undefined,
        authorName: form.authorName.trim(),
        status: form.status,
      };

      if (editingId) {
        await apiFetch(`/api/admin/journal/posts/${form.slug}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setSuccess('Post zaktualizowany.');
      } else {
        await apiFetch('/api/admin/journal/posts', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setSuccess('Post utworzony.');
      }
      await loadPosts();
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Błąd zapisu');
    }
  }

  function field(name: keyof FormState) {
    return {
      value: form[name] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((prev) => ({ ...prev, [name]: e.target.value })),
    };
  }

  const inputClass = 'w-full rounded-lg border border-[#253035] bg-[#131A1F] px-4 py-2.5 text-sm text-[#EDE8DF] focus:border-[#5CB88C] focus:outline-none';
  const labelClass = 'mb-1 block text-xs uppercase tracking-wider text-[#5A5550]';

  return (
    <main className="min-h-screen bg-[#070A0C] px-6 py-12 text-[#EDE8DF]">
      <div className="mx-auto max-w-4xl">
        <a href="/admin" className="mb-6 block text-sm text-[#1E9AB0] hover:underline">
          ← Panel admina
        </a>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-[#5CB88C]">
          TravelPoint Ops
        </p>
        <h1 className="mb-8 text-3xl font-bold">Journal CMS</h1>

        <div className="mb-6 flex gap-3">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="JWT moderatora"
            className="min-w-0 flex-1 rounded-lg border border-[#253035] bg-[#0C1014] px-4 py-3"
          />
          <button
            type="button"
            onClick={() => void loadPosts()}
            className="rounded-lg border border-[#253035] px-5 py-3 text-sm text-[#C4B9AC]"
          >
            Odśwież
          </button>
          <button
            type="button"
            onClick={startNew}
            className="rounded-lg bg-[#5CB88C] px-5 py-3 font-semibold text-[#070A0C]"
          >
            + Nowy post
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-[#C86840]">{error}</p>}
        {success && <p className="mb-4 text-sm text-[#5CB88C]">{success}</p>}

        {showForm && (
          <div className="mb-8 rounded-xl border border-[#1E9AB0] bg-[#0C1014] p-6">
            <h2 className="mb-6 text-xl font-semibold">
              {editingId ? 'Edytuj post' : 'Nowy post'}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Slug</label>
                <input {...field('slug')} className={inputClass} placeholder="moj-post-url" disabled={!!editingId} />
              </div>
              <div>
                <label className={labelClass}>Autor</label>
                <input {...field('authorName')} className={inputClass} placeholder="Jan Kowalski" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Tytuł</label>
                <input {...field('title')} className={inputClass} placeholder="Tytuł artykułu" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Excerpt</label>
                <input {...field('excerpt')} className={inputClass} placeholder="Krótki opis (do 300 znaków)" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Cover image URL</label>
                <input {...field('coverImage')} className={inputClass} placeholder="https://…" />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select {...field('status')} className={inputClass}>
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Treść (MDX)</label>
              <textarea
                {...field('bodyMdx')}
                rows={12}
                className={`${inputClass} resize-y font-mono`}
                placeholder="## Nagłówek&#10;&#10;Treść artykułu w MDX…"
              />
              <p className="mt-1 text-xs text-[#5A5550]">
                {editingId ? 'Puste pole = bez zmiany treści.' : 'Wymagane przy tworzeniu.'}
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => void submit()}
                className="rounded-lg bg-[#5CB88C] px-6 py-2.5 font-semibold text-[#070A0C]"
              >
                {editingId ? 'Zaktualizuj' : 'Utwórz'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                className="rounded-lg border border-[#253035] px-6 py-2.5 text-sm text-[#C4B9AC]"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-[#253035] bg-[#0C1014] p-5"
            >
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    post.status === 'PUBLISHED'
                      ? 'bg-[#5CB88C]/20 text-[#5CB88C]'
                      : 'bg-[#253035] text-[#8A827A]'
                  }`}>
                    {post.status}
                  </span>
                  <time className="font-mono text-xs text-[#5A5550]">
                    {new Date(post.createdAt).toLocaleDateString('pl-PL')}
                  </time>
                </div>
                <p className="font-semibold">{post.title}</p>
                <p className="mt-0.5 font-mono text-xs text-[#5A5550]">/journal/{post.slug}</p>
                <p className="mt-1 text-sm text-[#8A827A]">Autor: {post.authorName}</p>
              </div>
              <button
                type="button"
                onClick={() => startEdit(post)}
                className="shrink-0 rounded-md border border-[#253035] px-4 py-2 text-sm text-[#C4B9AC] hover:border-[#5CB88C]"
              >
                Edytuj
              </button>
            </article>
          ))}
          {posts.length === 0 && token && (
            <p className="text-center text-[#5A5550]">Brak postów w bazie.</p>
          )}
        </div>
      </div>
    </main>
  );
}
