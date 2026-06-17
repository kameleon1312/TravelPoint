import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
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

export default function MapPage(): React.JSX.Element {
  const token = process.env['NEXT_PUBLIC_MAPBOX_TOKEN'] ?? '';
  const hasToken = token && token !== 'pk.CHANGE_ME';

  return (
    <>
      <WorldNav />

      {/* Full-height map layout */}
      <div className="fixed inset-0 bg-abyss flex flex-col">

        {/* Map */}
        <div className="flex-1 relative overflow-hidden">
          <DiscoveryMap token={hasToken ? token : undefined} />
        </div>
      </div>
    </>
  );
}
