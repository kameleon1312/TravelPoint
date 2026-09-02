import type { Metadata } from 'next';
import { WorldNav } from '@/components/layout/WorldNav';
import { MapClient } from './MapClient';

export const metadata: Metadata = {
  title: 'Discovery Map — Publiczne Odkrycia',
  description: 'Mapa publicznych odkryć eksploratorów TravelPoint. Ukryte miejsca, opuszczone obiekty, tajne trasy — wszystkie z zachowaniem geo-prywatności (±500m).',
  openGraph: {
    title: 'Discovery Map — TravelPoint',
    description: 'Mapa publicznych odkryć eksploratorów. Geo-prywatność ±500m.',
    type: 'website',
  },
};

export default function MapPage(): React.JSX.Element {
  const token = process.env['NEXT_PUBLIC_MAPBOX_TOKEN'] ?? '';
  const hasToken = token && token !== 'pk.CHANGE_ME';

  return (
    <>
      <WorldNav />

      {/* fixed inset-0 is the only layout that reliably gives the Mapbox canvas
          its full-viewport dimensions across all Next.js SSR/hydration scenarios. */}
      <div className="fixed inset-0 bg-abyss">
        <MapClient token={hasToken ? token : undefined} />
      </div>
    </>
  );
}
