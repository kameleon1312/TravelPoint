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
  const apiKey = process.env['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'] ?? '';
  const hasKey = apiKey.length > 10;

  return (
    <>
      <WorldNav />

      <div
        className="fixed inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 70% at 50% 54%, #0C1014 30%, #070A0C 100%)
          `,
        }}
      >
        <MapClient token={hasKey ? apiKey : undefined} />
      </div>
    </>
  );
}
