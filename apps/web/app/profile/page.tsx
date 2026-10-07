'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WorldNav } from '@/components/layout/WorldNav';
import { apiFetch, getStoredToken, clearStoredToken } from '@/lib/webAuth';

interface MyProfile {
  id: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  archetype: string;
  bio?: string;
  obsessions: string[];
  territories: string[];
  rank: string;
  role: string;
  tier: string;
  emailVerified: boolean;
  locationConsent: boolean;
  presenceConsent: boolean;
  createdAt: string;
}

const RANK_COLORS: Record<string, string> = {
  NEWCOMER: '#5A5550',
  EXPLORER: '#C4B9AC',
  TRUSTED:  '#1E9AB0',
  INSIDER:  '#5CB88C',
  LEGEND:   '#C86840',
};

const RANK_LABELS: Record<string, string> = {
  NEWCOMER: 'Nowicjusz',
  EXPLORER: 'Explorer',
  TRUSTED:  'Zaufany',
  INSIDER:  'Wtajemniczony',
  LEGEND:   'Legenda',
};

const ARCHETYPE_ICONS: Record<string, string> = {
  WANDERER: '◎', URBEXER: '◈', NOMAD: '◉', HUNTER: '◑', PILGRIM: '◐',
};

const ARCHETYPE_LABELS: Record<string, string> = {
  WANDERER: 'Włóczęga', URBEXER: 'Urbexer', NOMAD: 'Nomada', HUNTER: 'Łowca', PILGRIM: 'Pielgrzym',
};

const TIER_LABELS: Record<string, string> = {
  FREE:       'Explorer Free',
  PRO:        'Explorer Pro',
  EXPEDITION: 'Explorer Expedition',
};

export default function ProfilePage() {
  const [profile, setProfile]   = useState<MyProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace('/login?returnUrl=%2Fprofile');
      return;
    }
    apiFetch<MyProfile>('/api/explorers/me')
      .then(setProfile)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Błąd';
        if (msg === 'UNAUTHORIZED') {
          clearStoredToken();
          router.replace('/login?returnUrl=%2Fprofile');
        } else {
          setError(msg);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  function handleSignOut() {
    clearStoredToken();
    router.push('/forum');
  }

  return (
    <div className="min-h-screen bg-abyss text-starlight">
      <WorldNav />

      <main className="max-w-2xl mx-auto px-4 pt-32 pb-20">

        {loading && (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <span className="font-mono text-sm text-starFaint animate-pulse">◉ ładowanie…</span>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-ember/30 bg-graphite p-6 text-center">
            <p className="font-mono text-xs text-ember mb-2">◈ błąd połączenia z API</p>
            <p className="font-sans text-sm text-star mb-4">{error}</p>
            <p className="font-sans text-xs text-starFaint">
              Jeśli właśnie wróciłeś do sieci — poczekaj chwilę na zimny start serwera (~45s) i odśwież stronę.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-starlight border border-steel hover:border-aurora/50 transition-colors"
            >
              Odśwież
            </button>
          </div>
        )}

        {profile && !loading && (
          <>
            {/* Identity header */}
            <div className="flex items-start gap-5 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-graphite border border-steel flex items-center justify-center flex-shrink-0 text-2xl">
                {ARCHETYPE_ICONS[profile.archetype] ?? '◎'}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-2xl font-bold text-starlight truncate">
                  {profile.displayName ?? profile.handle}
                </h1>
                <p className="font-mono text-sm text-starFaint mt-0.5">@{profile.handle}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span
                    className="font-mono text-xs px-2.5 py-1 rounded-full border"
                    style={{ color: RANK_COLORS[profile.rank] ?? '#C4B9AC', borderColor: (RANK_COLORS[profile.rank] ?? '#C4B9AC') + '50' }}
                  >
                    {RANK_LABELS[profile.rank] ?? profile.rank}
                  </span>
                  <span className="font-mono text-xs px-2.5 py-1 rounded-full border border-steel text-starFaint">
                    {TIER_LABELS[profile.tier] ?? profile.tier}
                  </span>
                  {profile.role === 'MODERATOR' || profile.role === 'ADMIN' ? (
                    <span className="font-mono text-xs px-2.5 py-1 rounded-full border border-signal/50 text-signal">
                      {profile.role === 'ADMIN' ? '◈ Admin' : '◉ Moderator'}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Archetype */}
            <section className="rounded-2xl bg-graphite border border-steel p-5 mb-4">
              <h2 className="font-mono text-xs text-starFaint uppercase tracking-wider mb-3">Archetyp</h2>
              <p className="font-sans text-sm text-star">
                {ARCHETYPE_ICONS[profile.archetype] ?? '◎'}{'  '}
                {ARCHETYPE_LABELS[profile.archetype] ?? profile.archetype}
              </p>
            </section>

            {/* Bio */}
            {profile.bio && (
              <section className="rounded-2xl bg-graphite border border-steel p-5 mb-4">
                <h2 className="font-mono text-xs text-starFaint uppercase tracking-wider mb-3">O sobie</h2>
                <p className="font-sans text-sm text-star leading-relaxed">{profile.bio}</p>
              </section>
            )}

            {/* Obsessions */}
            {profile.obsessions.length > 0 && (
              <section className="rounded-2xl bg-graphite border border-steel p-5 mb-4">
                <h2 className="font-mono text-xs text-starFaint uppercase tracking-wider mb-3">Obsesje</h2>
                <div className="flex flex-wrap gap-2">
                  {profile.obsessions.map((obs) => (
                    <span key={obs} className="font-mono text-xs px-2.5 py-1 rounded-full border border-steel text-starFaint">
                      {obs}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Account info */}
            <section className="rounded-2xl bg-graphite border border-steel p-5 mb-4">
              <h2 className="font-mono text-xs text-starFaint uppercase tracking-wider mb-3">Konto</h2>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="font-sans text-xs text-starFaint">E-mail zweryfikowany</span>
                  <span className={`font-mono text-xs ${profile.emailVerified ? 'text-aurora' : 'text-ember'}`}>
                    {profile.emailVerified ? '◉ tak' : '◈ nie'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-xs text-starFaint">Zgoda na lokalizację</span>
                  <span className={`font-mono text-xs ${profile.locationConsent ? 'text-aurora' : 'text-starFaint'}`}>
                    {profile.locationConsent ? '◉ tak' : '◎ nie'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-xs text-starFaint">Zgoda na obecność</span>
                  <span className={`font-mono text-xs ${profile.presenceConsent ? 'text-aurora' : 'text-starFaint'}`}>
                    {profile.presenceConsent ? '◉ tak' : '◎ nie'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-xs text-starFaint">Dołączyłeś</span>
                  <span className="font-mono text-xs text-starFaint">
                    {new Date(profile.createdAt).toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </section>

            {/* Actions */}
            <section className="flex flex-col gap-3 mt-6">
              <Link
                href={`/explorer/${profile.handle}`}
                className="flex items-center justify-center px-5 py-3 rounded-xl border border-steel text-sm font-sans text-star hover:text-starlight hover:border-aurora/40 transition-colors"
              >
                ◉ Zobacz publiczny profil
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center px-5 py-3 rounded-xl border border-ember/30 text-sm font-sans text-ember/80 hover:text-ember hover:border-ember/60 transition-colors"
              >
                ◈ Wyloguj się
              </button>
            </section>

            <p className="mt-8 font-sans text-xs text-starGhost text-center leading-relaxed">
              Zarządzanie pełnym profilem, mapami, kręgami i wyprawami dostępne jest w aplikacji mobilnej TravelPoint.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
