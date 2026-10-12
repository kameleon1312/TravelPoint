import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { WorldNav } from '@/components/layout/WorldNav';
import { serializeJsonLd } from '@/lib/jsonLd';

interface Props {
  params: Promise<{ handle: string }>;
}

interface PublicProfile {
  id: string;
  handle: string;
  displayName?: string;
  archetype: string;
  bio?: string;
  obsessions: string[];
  rank: string;
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
  WANDERER: '◎',
  URBEXER:  '◈',
  NOMAD:    '◉',
  HUNTER:   '◑',
  PILGRIM:  '◐',
};

const ARCHETYPE_LABELS: Record<string, string> = {
  WANDERER: 'Włóczęga',
  URBEXER:  'Urbexer',
  NOMAD:    'Nomada',
  HUNTER:   'Łowca',
  PILGRIM:  'Pielgrzym',
};

const ARCHETYPE_DESC: Record<string, string> = {
  WANDERER: 'Bez celu, wszędzie w domu',
  URBEXER:  'Tam gdzie wstęp wzbroniony',
  NOMAD:    'Droga jest domem',
  HUNTER:   'Każde odkrycie to cel',
  PILGRIM:  'Miejsca mają dusze',
};

async function fetchProfile(handle: string): Promise<PublicProfile | null> {
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${apiUrl}/api/explorers/${handle}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<PublicProfile>;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const profile = await fetchProfile(handle);

  if (!profile) {
    return {
      title: `@${handle} — Explorer nie znaleziony`,
      robots: { index: false, follow: false },
    };
  }

  const title = profile.displayName
    ? `${profile.displayName} (@${profile.handle}) — TravelPoint`
    : `@${profile.handle} — TravelPoint Explorer`;

  const description = profile.bio
    ? profile.bio
    : `${ARCHETYPE_LABELS[profile.archetype] ?? profile.archetype} · Rank: ${RANK_LABELS[profile.rank] ?? profile.rank} · TravelPoint Explorer`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      username: profile.handle,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function ExplorerProfilePage({ params }: Props): Promise<React.JSX.Element> {
  const { handle } = await params;
  const profile = await fetchProfile(handle);

  if (!profile) notFound();

  const rankColor   = RANK_COLORS[profile.rank] ?? '#5A5550';
  const archetypeIcon = ARCHETYPE_ICONS[profile.archetype] ?? '◎';
  const initial = profile.handle[0]?.toUpperCase() ?? '?';

  return (
    <>
      <WorldNav />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: profile.displayName ?? `@${profile.handle}`,
            alternateName: `@${profile.handle}`,
            description: profile.bio ?? ARCHETYPE_DESC[profile.archetype],
            memberOf: { '@type': 'Organization', name: 'TravelPoint', url: process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://travelpoint.app' },
          }),
        }}
      />

      <main className="min-h-screen bg-abyss pt-24 pb-24 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Back */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-xs text-starFaint hover:text-star transition-colors mb-10 group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            <span className="uppercase tracking-widest">TravelPoint</span>
          </Link>

          {/* Profile card */}
          <div className="relative rounded-3xl border border-steel bg-graphite overflow-hidden mb-6">
            {/* Rank color top bar */}
            <div
              className="h-0.5"
              style={{ background: `linear-gradient(90deg, ${rankColor}, transparent)` }}
            />

            {/* Background glow */}
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.06] blur-3xl pointer-events-none"
              style={{ background: rankColor }}
              aria-hidden
            />

            <div className="relative p-8 md:p-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-20 h-20 rounded-2xl border-2 flex items-center justify-center"
                    style={{
                      borderColor: rankColor + '80',
                      background: `radial-gradient(circle at 30% 30%, ${rankColor}18, transparent)`,
                      boxShadow: `0 0 24px ${rankColor}30`,
                    }}
                  >
                    <span
                      className="font-display text-3xl font-bold"
                      style={{ color: rankColor }}
                    >
                      {initial}
                    </span>
                  </div>
                  {/* Rank badge */}
                  <div
                    className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-wider"
                    style={{ borderColor: rankColor + '60', color: rankColor, background: '#0C1014' }}
                  >
                    {RANK_LABELS[profile.rank] ?? profile.rank}
                  </div>
                </div>

                {/* Name + handle */}
                <div className="flex-1">
                  {profile.displayName && (
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-starlight tracking-tight leading-none mb-1">
                      {profile.displayName}
                    </h1>
                  )}
                  <p className="font-mono text-sm text-starFaint">@{profile.handle}</p>

                  {/* Archetype */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="font-mono text-sm" style={{ color: rankColor }}>
                      {archetypeIcon}
                    </span>
                    <span className="font-mono text-xs text-starGhost uppercase tracking-widest">
                      {ARCHETYPE_LABELS[profile.archetype] ?? profile.archetype}
                    </span>
                    <span className="font-sans text-xs text-starGhost">
                      — {ARCHETYPE_DESC[profile.archetype]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="mt-6 font-sans text-sm text-star leading-relaxed border-t border-steel pt-6">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          {/* Obsessions */}
          {profile.obsessions?.length > 0 && (
            <div className="rounded-2xl border border-steel bg-graphite p-6 mb-6">
              <p className="font-mono text-[10px] text-starFaint uppercase tracking-widest mb-4">
                Obsesje
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.obsessions.map((obs) => (
                  <span
                    key={obs}
                    className="glass px-3 py-1.5 rounded-full font-mono text-xs border border-aurora/20 text-aurora"
                  >
                    {obs}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hidden layer teaser */}
          <div className="rounded-2xl border border-ember/20 bg-ember/5 p-6 mb-8">
            <div className="flex items-start gap-4">
              <span className="font-mono text-2xl text-ember flex-shrink-0">◈</span>
              <div>
                <p className="font-mono text-xs text-ember uppercase tracking-widest mb-2">Ukryta Warstwa</p>
                <p className="font-sans text-sm text-star leading-relaxed">
                  Spoty, journeys i circles tego explorera są widoczne wyłącznie w aplikacji CORE
                  dla uprawnionych członków sieci.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center space-y-4">
            <p className="font-sans text-sm text-starFaint">
              Chcesz być częścią sieci razem z @{profile.handle}?
            </p>
            <Link
              href="/#join"
              className="inline-block px-8 py-4 rounded-xl font-sans font-semibold text-sm text-void bg-aurora hover:brightness-110 transition-all"
            >
              Chcę dołączyć do sieci →
            </Link>
          </div>

        </div>
      </main>
    </>
  );
}
