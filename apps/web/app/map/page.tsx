import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { WorldNav } from '@/components/layout/WorldNav';

export const metadata: Metadata = {
  title: 'Discovery Map — Publiczne Odkrycia',
  description: 'Mapa publicznych odkryć eksploratorów TravelPoint. Ukryte miejsca, opuszczone obiekty, tajne trasy — wszystkie z zachowaniem geo-prywatności (±500m).',
  openGraph: {
    title: 'Discovery Map — TravelPoint',
    description: 'Mapa publicznych odkryć eksploratorów. Geo-prywatność ±500m.',
    type: 'website',
  },
};

// Mapbox GL JS wymaga przeglądarki — ssr: false
const DiscoveryMap = dynamic(
  () => import('@/components/map/DiscoveryMap').then((m) => m.DiscoveryMap),
  { ssr: false, loading: () => <MapLoadingFallback /> },
);

function MapLoadingFallback() {
  return (
    <div className="w-full h-full bg-abyss flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-aurora/30 border-t-aurora rounded-full animate-spin mx-auto" />
        <p className="font-mono text-xs text-starFaint uppercase tracking-widest">
          Ładowanie mapy...
        </p>
      </div>
    </div>
  );
}

function NoTokenFallback() {
  return (
    <div className="w-full h-full bg-abyss flex items-center justify-center p-8">
      <div className="max-w-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl border border-steel bg-graphite flex items-center justify-center mx-auto">
          <span className="font-mono text-2xl text-starGhost">◈</span>
        </div>
        <div>
          <p className="font-mono text-xs text-starFaint uppercase tracking-widest mb-3">
            Mapbox Token
          </p>
          <h2 className="font-display text-xl font-bold text-starlight mb-2">
            Mapa niedostępna lokalnie
          </h2>
          <p className="font-sans text-sm text-star leading-relaxed">
            Dodaj <code className="font-mono text-aurora text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> do{' '}
            <code className="font-mono text-aurora text-xs">.env.local</code>, aby uruchomić mapę.
          </p>
        </div>
        <div className="glass rounded-xl p-4 border border-steel text-left space-y-1">
          <p className="font-mono text-xs text-starFaint">1. Utwórz konto na mapbox.com</p>
          <p className="font-mono text-xs text-starFaint">2. Skopiuj public token</p>
          <p className="font-mono text-xs text-aurora">NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...</p>
        </div>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl font-sans font-semibold text-sm text-void bg-aurora hover:brightness-110 transition-all"
        >
          ← Wróć na stronę główną
        </Link>
      </div>
    </div>
  );
}

export default function MapPage(): React.JSX.Element {
  const token = process.env['NEXT_PUBLIC_MAPBOX_TOKEN'] ?? '';
  const hasToken = token && token !== 'pk.CHANGE_ME';

  return (
    <>
      <WorldNav />

      {/* Full-height map layout */}
      <div className="fixed inset-0 bg-abyss flex flex-col">

        {/* Top bar */}
        <div className="relative z-20 flex items-center gap-4 px-4 md:px-8 pt-20 pb-3 pointer-events-none">
          <div className="flex items-center gap-3 glass rounded-2xl px-5 py-3 border border-steel pointer-events-auto">
            <div className="w-2 h-2 rounded-full bg-aurora animate-signal-pulse" />
            <div>
              <p className="font-mono text-[10px] text-starFaint uppercase tracking-widest leading-none mb-0.5">
                World Map
              </p>
              <p className="font-display text-sm font-bold text-starlight leading-none">
                Discovery
              </p>
            </div>
          </div>

          <div className="glass rounded-2xl px-4 py-3 border border-steel pointer-events-auto hidden md:flex items-center gap-2">
            <span className="font-mono text-xs text-starGhost">◉</span>
            <p className="font-sans text-xs text-starFaint">
              Lokalizacje przybliżone ± 500m — <span className="text-aurora">geo-privacy</span>
            </p>
          </div>

          <div className="ml-auto pointer-events-auto">
            <Link
              href="/#join"
              className="px-4 py-2.5 rounded-xl font-sans font-semibold text-xs text-void bg-aurora hover:brightness-110 transition-all whitespace-nowrap"
            >
              Dołącz do sieci →
            </Link>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative overflow-hidden">
          {hasToken ? (
            <DiscoveryMap token={token} />
          ) : (
            <NoTokenFallback />
          )}
        </div>
      </div>
    </>
  );
}
