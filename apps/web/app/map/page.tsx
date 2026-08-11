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

      {/* Full-height map layout */}
      <div className="fixed inset-0 bg-abyss flex flex-col">

        {/* Map */}
        <div className="flex-1 relative overflow-hidden">
          <MapClient token={hasToken ? token : undefined} />
        </div>
      </div>
    </>
  );
}
