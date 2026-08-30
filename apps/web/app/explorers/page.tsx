'use client';

import { useState, useRef, useTransition } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { WorldNav } from '@/components/layout/WorldNav';
import { apiFetch } from '@/lib/webAuth';

interface Explorer {
  id: string;
  handle: string;
  displayName?: string | null;
  rank: string;
  archetype?: string | null;
}

const RANK_COLORS: Record<string, string> = {
  NEWCOMER: '#5A5550',
  EXPLORER: '#C4B9AC',
  TRUSTED:  '#1E9AB0',
  INSIDER:  '#5CB88C',
  LEGEND:   '#C86840',
};

const RANK_ICONS: Record<string, string> = {
  NEWCOMER: '○',
  EXPLORER: '◎',
  TRUSTED:  '◑',
  INSIDER:  '◈',
  LEGEND:   '◉',
};

export default function ExplorersPage(): ReactElement {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Explorer[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) { setError('Wpisz co najmniej 2 znaki.'); return; }
    setError('');
    startTransition(async () => {
      try {
        const data = await apiFetch<Explorer[]>(`/api/explorers/search?q=${encodeURIComponent(q)}`);
        setResults(data);
        setSearched(true);
      } catch (err) {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
          setError('Zaloguj się, aby przeszukiwać explorerów.');
        } else {
          setError('Błąd wyszukiwania. Spróbuj ponownie.');
        }
      }
    });
  }

  return (
    <>
      <WorldNav />
      <main className="min-h-screen bg-abyss pt-28 pb-24 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-12 text-center">
            <p className="eyebrow mb-4">Sieć TravelPoint</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-starlight tracking-tight mb-4">
              Znajdź explorerów
            </h1>
            <p className="font-sans text-base text-star">
              Wyszukaj po nazwie lub handlu. Obserwuj, pisz, buduj circle.
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={(e) => void handleSearch(e)} className="mb-10">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="handle lub imię explorera..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 rounded-2xl border border-steel bg-graphite px-5 py-3.5 font-mono text-sm text-starlight placeholder:text-starGhost focus:border-aurora focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-2xl bg-aurora px-6 py-3.5 font-sans font-semibold text-sm text-void transition hover:brightness-110 disabled:opacity-50"
              >
                {isPending ? '...' : 'Szukaj'}
              </button>
            </div>
            {error && <p className="mt-3 font-mono text-xs text-ember">{error}</p>}
          </form>

          {/* Results */}
          {searched && results.length === 0 && !isPending && (
            <div className="text-center py-16">
              <p className="font-mono text-xs uppercase tracking-widest text-starGhost mb-3">Brak wyników</p>
              <p className="font-sans text-sm text-starFaint">
                Żaden explorer nie pasuje do &ldquo;{query}&rdquo;.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="grid gap-3">
              {results.map((explorer) => {
                const rankColor = RANK_COLORS[explorer.rank] ?? '#5A5550';
                const rankIcon  = RANK_ICONS[explorer.rank] ?? '○';
                return (
                  <Link
                    key={explorer.id}
                    href={`/explorer/${explorer.handle}`}
                    className="group flex items-center gap-4 rounded-2xl border border-steel bg-graphite px-5 py-4 hover:border-starGhost transition-colors"
                  >
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: rankColor + '70' }}
                    >
                      <span
                        className="font-display text-base font-bold"
                        style={{ color: rankColor }}
                      >
                        {explorer.handle[0]?.toUpperCase() ?? '?'}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-sans font-semibold text-starlight group-hover:text-aurora transition-colors truncate">
                        {explorer.displayName ?? `@${explorer.handle}`}
                      </p>
                      <p className="font-mono text-xs text-starGhost truncate">
                        @{explorer.handle}
                        {explorer.archetype ? ` · ${explorer.archetype}` : ''}
                      </p>
                    </div>

                    {/* Rank */}
                    <div
                      className="flex-shrink-0 font-mono text-xs uppercase tracking-wider"
                      style={{ color: rankColor }}
                    >
                      {rankIcon} {explorer.rank}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Prompt to sign in if no token */}
          {!searched && !isPending && (
            <div className="text-center py-16 border border-dashed border-steel rounded-3xl">
              <p className="font-mono text-xs uppercase tracking-widest text-starGhost mb-4">
                Sieć prywatna
              </p>
              <p className="font-sans text-sm text-starFaint max-w-xs mx-auto leading-relaxed">
                Wyszukiwanie explorerów wymaga zalogowania. Skorzystaj z aplikacji mobilnej TravelPoint lub zaloguj się na forum.
              </p>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
