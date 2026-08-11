'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import type mapboxgl from 'mapbox-gl';
import type { ProjectionSpecification, FogSpecification } from 'mapbox-gl';
import { SpotPanel, type PublicSpot } from './SpotPanel';
// mapbox-gl requires its CSS to render correctly
import 'mapbox-gl/dist/mapbox-gl.css';

type MapboxGL = typeof mapboxgl;

// ── Category filter config ────────────────────────────────────────────────────
const CATEGORIES = [
  { value: '',            label: 'Wszystkie' },
  { value: 'ABANDONED',  label: 'Opuszczone' },
  { value: 'UNDERGROUND',label: 'Podziemia' },
  { value: 'VIEWPOINT',  label: 'Widoki' },
  { value: 'ROUTE',      label: 'Trasy' },
  { value: 'BEACH',      label: 'Plaże' },
  { value: 'CAMP',       label: 'Bazy' },
];

const CATEGORY_COLORS: Record<string, string> = {
  ABANDONED:   '#C86840',
  CAFE:        '#5CB88C',
  BEACH:       '#1E9AB0',
  ROUTE:       '#C8A456',
  UNDERGROUND: '#7A6D9E',
  VIEWPOINT:   '#5CB88C',
  CAMP:        '#4A8A6A',
};

// Terra Mare dark nautical Mapbox style
const MAP_STYLE = 'mapbox://styles/mapbox/navigation-night-v1';
const FALLBACK_ZOOM = 5;
const FALLBACK_CENTER = { lng: 19.5, lat: 51.8 };
const TILE_SIZE = 256;

interface Props {
  token?: string;
}

export function DiscoveryMap({ token }: Props): React.JSX.Element {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<mapboxgl.Map | null>(null);
  const markersRef    = useRef<mapboxgl.Marker[]>([]);
  const [selected, setSelected]       = useState<PublicSpot | null>(null);
  const [spots, setSpots]             = useState<PublicSpot[]>([]);
  const [category, setCategory]       = useState('');
  const [loading, setLoading]         = useState(true);
  const [mapReady, setMapReady]       = useState(false);
  const [spotsLoaded, setSpotsLoaded] = useState(false);

  // ── Load spots ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);

    fetch(`/api/spots?${params.toString()}`)
      .then((r) => r.json())
      .then((data: unknown) => {
        setSpots(Array.isArray(data) ? (data as PublicSpot[]) : []);
        setSpotsLoaded(true);
      })
      .catch(() => {
        setSpots([]);
        setSpotsLoaded(true);
      });
  }, [category]);

  // ── Init Mapbox ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setMapReady(true);
      setLoading(false);
      return;
    }
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;

    import('mapbox-gl').then((mod) => {
      if (!mounted || !containerRef.current) return;

      const Mapbox = (mod.default ?? mod) as MapboxGL;
      if (token) Mapbox.accessToken = token;

      const map = new Mapbox.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: [19.5, 51.8],
        zoom: 5.2,
        minZoom: 2,
        maxZoom: 16,
        projection: { name: 'globe' } as ProjectionSpecification,
      });

      map.on('load', () => {
        if (!mounted) return;

        // Fog must be set after load — not supported in MapOptions constructor in v3.
        try {
          const fog: FogSpecification = {
            color: '#0C1014',
            'high-color': '#0F1E2A',
            'horizon-blend': 0.08,
            'space-color': '#070A0C',
            'star-intensity': 0.15,
          };
          map.setFog(fog);
        } catch { /* style may not support fog */ }

        // Override map colors to match Terra Mare palette. Layer names are
        // style-dependent; catch if they don't exist in this style variant.
        // setPaintProperty accepts any string for layer/property — cast is safe.
        const overrides: Array<[string, string, string]> = [
          ['background', 'background-color', '#0C1014'],
          ['water',      'fill-color',       '#0F1E2A'],
          ['land',       'background-color', '#131A1F'],
        ];
        for (const [layer, prop, val] of overrides) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            map.setPaintProperty(layer, prop as any, val);
          } catch { /* layer absent in this style */ }
        }

        setMapReady(true);
        setLoading(false);
        requestAnimationFrame(() => map.resize());
      });

      mapRef.current = map;
      setTimeout(() => map.resize(), 250);
    }).catch(() => {
      setLoading(false);
    });

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [token]);

  // ── Render markers ──────────────────────────────────────────────────────────
  const renderMarkers = useCallback(() => {
    if (!token || !mapRef.current || !mapReady) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    import('mapbox-gl').then((mod) => {
      const Mapbox = (mod.default ?? mod) as MapboxGL;

      spots.forEach((spot) => {
        const el = document.createElement('div');
        const color = CATEGORY_COLORS[spot.category] ?? '#5CB88C';
        const rgb = hexToRgb(color);
        el.style.cssText = `
          width: 10px; height: 10px; border-radius: 50%;
          background: ${color};
          box-shadow: 0 0 0 2px rgba(${rgb}, 0.3), 0 0 8px rgba(${rgb}, 0.5);
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        `;
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.8)';
          el.style.boxShadow = `0 0 0 3px rgba(${rgb}, 0.4), 0 0 16px rgba(${rgb}, 0.7)`;
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
          el.style.boxShadow = `0 0 0 2px rgba(${rgb}, 0.3), 0 0 8px rgba(${rgb}, 0.5)`;
        });
        el.addEventListener('click', () => setSelected(spot));

        const marker = new Mapbox.Marker({ element: el, anchor: 'center' })
          .setLngLat([spot.lng, spot.lat])
          .addTo(mapRef.current!);

        markersRef.current.push(marker);
      });
    });
  }, [spots, mapReady, token]);

  useEffect(() => {
    if (mapReady && spotsLoaded) renderMarkers();
  }, [mapReady, spotsLoaded, renderMarkers]);

  return (
    <div className="relative w-full h-full">
      {/* Map container */}
      {token ? (
        <div ref={containerRef} className="absolute inset-0" />
      ) : (
        <FreeTileMap spots={spots} onSelect={setSelected} />
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-abyss flex items-center justify-center z-20">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-aurora/30 border-t-aurora rounded-full animate-spin mx-auto" />
            <p className="font-mono text-xs text-starFaint uppercase tracking-widest">
              Ładowanie mapy...
            </p>
          </div>
        </div>
      )}

      {/* Viewport HUD */}
      {!loading && (
        <div className="absolute left-4 right-4 top-24 z-10 md:left-8 md:right-auto md:top-28 md:w-[390px] pointer-events-auto">
          <div className="rounded-[28px] border border-steel/70 bg-abyss/82 p-4 shadow-2xl shadow-void/40 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-aurora/20 bg-aurora/10">
                  <span className="h-2.5 w-2.5 rounded-full bg-aurora shadow-[0_0_18px_rgba(92,184,140,0.75)]" />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-starGhost">
                    World Map
                  </p>
                  <h1 className="font-display text-lg font-bold leading-none text-starlight">
                    Discovery
                  </h1>
                </div>
              </div>
              <div className="rounded-full border border-steel/70 bg-graphite/60 px-2.5 py-1">
                <p className="font-mono text-[10px] text-starGhost">
                  {token ? 'Mapbox' : 'Free tiles'}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-steel/50 bg-void/30 px-3 py-2">
              <p className="font-sans text-xs leading-relaxed text-starFaint">
                Lokalizacje są przybliżone ±500m. <span className="text-aurora">Geo-prywatność</span> zostaje aktywna także na publicznej mapie.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => { setCategory(cat.value); setSelected(null); }}
                  className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide transition-all duration-150 ${
                    category === cat.value
                      ? 'border-aurora bg-aurora text-void shadow-[0_0_18px_rgba(92,184,140,0.22)]'
                      : 'border-steel bg-abyss/70 text-starFaint hover:border-starGhost hover:text-star'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-steel/50 pt-3">
              <p className="font-mono text-[10px] text-starGhost">
                <span className="text-aurora">{spots.length}</span> odkryć na mapie
              </p>
              <Link
                href="/#join"
                className="rounded-full bg-aurora px-3.5 py-2 font-sans text-xs font-semibold text-void transition-all hover:brightness-110"
              >
                Dołącz →
              </Link>
            </div>
          </div>
        </div>
      )}

      {!loading && !mapReady && (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-abyss">
          <div className="rounded-3xl border border-steel bg-graphite p-6 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-starGhost">
              Nie udało się załadować kafelków mapy
            </p>
          </div>
        </div>
      )}

      {/* Attribution override */}
      <style>{`
        .mapboxgl-ctrl-bottom-right { display: none; }
        .mapboxgl-ctrl-bottom-left { left: 18px; bottom: 14px; }
        .mapboxgl-ctrl-bottom-left .mapboxgl-ctrl-attrib {
          background: rgba(12,16,20,0.7);
          border-radius: 6px;
          font-size: 9px;
          color: #5A5550;
        }
        .mapboxgl-ctrl-bottom-left .mapboxgl-ctrl-attrib a { color: #5A5550; }
      `}</style>

      {/* Spot panel */}
      <SpotPanel spot={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function FreeTileMap({
  spots,
  onSelect,
}: {
  spots: PublicSpot[];
  onSelect: (spot: PublicSpot) => void;
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1280, height: 720 });

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const center = lonLatToWorld(FALLBACK_CENTER.lng, FALLBACK_CENTER.lat, FALLBACK_ZOOM);
  const centerTileX = Math.floor(center.x);
  const centerTileY = Math.floor(center.y);
  const tilesX = Math.ceil(size.width / TILE_SIZE / 2) + 2;
  const tilesY = Math.ceil(size.height / TILE_SIZE / 2) + 2;
  const tiles: Array<{ x: number; y: number; left: number; top: number; url: string }> = [];

  for (let dx = -tilesX; dx <= tilesX; dx++) {
    for (let dy = -tilesY; dy <= tilesY; dy++) {
      const x = centerTileX + dx;
      const y = centerTileY + dy;
      if (x < 0 || y < 0) continue;
      tiles.push({
        x,
        y,
        left: size.width / 2 + (x - center.x) * TILE_SIZE,
        top: size.height / 2 + (y - center.y) * TILE_SIZE,
        url: `https://${['a', 'b', 'c'][Math.abs(x + y) % 3]}.basemaps.cartocdn.com/dark_all/${FALLBACK_ZOOM}/${x}/${y}.png`,
      });
    }
  }

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-[#090d10]">
      <div className="absolute inset-0 opacity-95">
        {tiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${tile.x}:${tile.y}`}
            src={tile.url}
            alt=""
            draggable={false}
            className="absolute h-64 w-64 select-none"
            style={{ left: tile.left, top: tile.top }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_44%,transparent_0%,rgba(7,10,12,0.18)_48%,rgba(7,10,12,0.74)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,12,0.42),transparent_28%,rgba(7,10,12,0.48))]" />

      {spots.map((spot) => {
        const point = lonLatToWorld(spot.lng, spot.lat, FALLBACK_ZOOM);
        const left = size.width / 2 + (point.x - center.x) * TILE_SIZE;
        const top = size.height / 2 + (point.y - center.y) * TILE_SIZE;
        if (left < -20 || top < -20 || left > size.width + 20 || top > size.height + 20) return null;
        const color = CATEGORY_COLORS[spot.category] ?? '#5CB88C';
        return (
          <button
            key={spot.id}
            type="button"
            onClick={() => onSelect(spot)}
            aria-label={spot.title}
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-void transition-transform hover:scale-150"
            style={{
              left,
              top,
              backgroundColor: color,
              boxShadow: `0 0 0 3px ${color}33, 0 0 18px ${color}88`,
            }}
          />
        );
      })}

      <div className="absolute bottom-4 left-5 rounded-lg border border-steel/60 bg-abyss/70 px-2 py-1 backdrop-blur">
        <p className="font-mono text-[9px] text-starGhost">
          © OpenStreetMap contributors © CARTO
        </p>
      </div>
    </div>
  );
}

function lonLatToWorld(lng: number, lat: number, zoom: number): { x: number; y: number } {
  const scale = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale,
  };
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
