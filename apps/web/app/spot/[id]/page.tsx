import type { ReactElement } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { WorldNav } from '@/components/layout/WorldNav';
import { serializeJsonLd } from '@/lib/jsonLd';

const API_URL = (process.env['NEXT_PUBLIC_API_URL'] ?? '').replace(/\/$/, '');
const APP_URL = (process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://travelpoint.app').replace(/\/$/, '');

interface PublicSpotDetail {
  id: string;
  title: string;
  category: string;
  lat: number;
  lng: number;
  createdAt: string;
  fuzzed?: boolean;
  description?: string;
  photoCount?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  ABANDONED:   'Opuszczone miejsce',
  CAFE:        'Kawiarnia',
  BEACH:       'Plaża',
  ROUTE:       'Trasa',
  UNDERGROUND: 'Podziemia',
  VIEWPOINT:   'Punkt widokowy',
  CAMP:        'Baza obozowa',
};

const CATEGORY_ICONS: Record<string, string> = {
  ABANDONED:   '◈',
  BEACH:       '◎',
  ROUTE:       '◉',
  UNDERGROUND: '◈',
  VIEWPOINT:   '◎',
  CAMP:        '◉',
  CAFE:        '◎',
};

async function fetchSpot(id: string): Promise<PublicSpotDetail | null> {
  try {
    const res = await fetch(`${API_URL}/api/spots/public/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicSpotDetail;
  } catch {
    return null;
  }
}

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const spot = await fetchSpot(id);
  if (!spot) return { title: 'Spot — TravelPoint' };
  const categoryLabel = CATEGORY_LABELS[spot.category] ?? spot.category;
  const description = `${categoryLabel} odkryty przez sieć eksploratorów TravelPoint. Lokalizacja przybliżona ±500m. Pełen dostęp w aplikacji CORE.`;
  return {
    title: spot.title,
    description,
    openGraph: {
      title:       spot.title,
      description: `${categoryLabel} · TravelPoint`,
      url:         `${APP_URL}/spot/${spot.id}`,
      type:        'article',
      images: [{ url: `${APP_URL}/og-spot.png`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function SpotPage({ params }: Props): Promise<ReactElement> {
  const { id } = await params;
  const spot = await fetchSpot(id);
  if (!spot) notFound();

  const categoryLabel = CATEGORY_LABELS[spot.category] ?? spot.category;
  const categoryIcon  = CATEGORY_ICONS[spot.category] ?? '◎';
  const discoveredDate = new Date(spot.createdAt).toLocaleDateString('pl-PL', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <>
      <WorldNav />
      <main className="min-h-screen bg-abyss pt-24 pb-16 px-4">
        <div className="max-w-lg mx-auto">

          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-starGhost">
            <Link href="/map" className="hover:text-starFaint transition-colors">Mapa</Link>
            <span>·</span>
            <span className="text-starFaint">{categoryLabel}</span>
          </nav>

          {/* Header card */}
          <div className="rounded-2xl border border-steel bg-graphite p-6 mb-4">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 rounded-xl bg-abyss border border-steel flex items-center justify-center flex-shrink-0">
                <span className="font-mono text-aurora text-2xl">{categoryIcon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-starFaint mb-1">
                  {categoryLabel}
                </p>
                <h1 className="font-display text-xl font-bold text-starlight leading-tight">
                  {spot.title}
                </h1>
              </div>
            </div>

            {spot.description && (
              <p className="font-sans text-sm text-star leading-relaxed mb-5 border-t border-steel/40 pt-4">
                {spot.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-steel/60 bg-abyss px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-starGhost mb-1">Współrzędne</p>
                <p className="font-mono text-xs text-aurora">{spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}</p>
                <p className="font-mono text-[9px] text-starGhost mt-0.5">±500m geo-privacy</p>
              </div>
              <div className="rounded-xl border border-steel/60 bg-abyss px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-starGhost mb-1">Odkryto</p>
                <p className="font-sans text-xs text-star leading-snug">{discoveredDate}</p>
              </div>
            </div>
          </div>

          {/* Hidden Layer teaser */}
          <div className="rounded-2xl border border-ember/20 bg-ember/5 p-6 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[10px] text-ember uppercase tracking-widest whitespace-nowrap">
                Hidden Layer
              </span>
              <span className="flex-1 h-px bg-ember/20" />
            </div>
            <p className="font-sans text-sm text-star leading-relaxed mb-3">
              Dokładna lokalizacja, historia odkrycia, zdjęcia i komentarze eksploratorów
              są dostępne wyłącznie w aplikacji CORE dla uprawnionych członków sieci.
            </p>
            {spot.photoCount != null && spot.photoCount > 0 && (
              <p className="font-mono text-[10px] text-starGhost">
                {spot.photoCount}{' '}
                {spot.photoCount === 1 ? 'zdjęcie' : spot.photoCount < 5 ? 'zdjęcia' : 'zdjęć'}{' '}
                · zablokowane
              </p>
            )}
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Link
              href="/download"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-aurora font-sans text-sm font-semibold text-void transition-all hover:brightness-110"
            >
              Pobierz CORE — odblokuj to miejsce
            </Link>
            <Link
              href="/map"
              className="flex items-center justify-center w-full py-3 rounded-xl border border-steel bg-graphite font-sans text-sm text-starFaint hover:text-star hover:border-starGhost transition-colors"
            >
              ← Wróć na mapę
            </Link>
          </div>

        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            '@context': 'https://schema.org',
            '@type':    'Place',
            name:        spot.title,
            description: CATEGORY_LABELS[spot.category] ?? spot.category,
            geo: {
              '@type':    'GeoCoordinates',
              latitude:   spot.lat,
              longitude:  spot.lng,
            },
          }),
        }}
      />
    </>
  );
}
