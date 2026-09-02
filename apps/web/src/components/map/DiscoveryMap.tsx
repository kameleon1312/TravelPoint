'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import type mapboxgl from 'mapbox-gl';
import type { ProjectionSpecification, FogSpecification } from 'mapbox-gl';
import { SpotPanel, type PublicSpot } from './SpotPanel';
import 'mapbox-gl/dist/mapbox-gl.css';

type MapboxGL = typeof mapboxgl;

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

const MAP_STYLE     = 'mapbox://styles/mapbox/dark-v11';
const FALLBACK_ZOOM = 5;
const FALLBACK_CENTER = { lng: 19.5, lat: 51.8 };
const TILE_SIZE     = 256;
const MAX_RETRIES   = 2;

// Largest sphere that fits nicely in the viewport below the nav.
// CSS min() with 3 values keeps it from overflowing on any device.
const GLOBE_SIZE = 'min(80vw, calc(100vh - 160px), 680px)';

// Layered box-shadow creates a glowing ocean-depth halo around the globe.
const GLOBE_SHADOW = [
  '0 0 0 1px rgba(92,184,140,0.10)',
  '0 0 0 4px rgba(7,10,12,0.96)',
  '0 0 50px rgba(30,154,176,0.20)',
  '0 0 120px rgba(30,154,176,0.10)',
  '0 0 240px rgba(92,184,140,0.05)',
].join(', ');

interface Props { token?: string }

export function DiscoveryMap({ token }: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<mapboxgl.Map | null>(null);
  const markersRef   = useRef<mapboxgl.Marker[]>([]);
  const retryRef     = useRef(0);

  const [selected, setSelected]       = useState<PublicSpot | null>(null);
  const [spots, setSpots]             = useState<PublicSpot[]>([]);
  const [category, setCategory]       = useState('');
  const [mapReady, setMapReady]       = useState(false);
  const [spotsLoaded, setSpotsLoaded] = useState(false);
  const [mapError, setMapError]       = useState(false);

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
      .catch(() => { setSpots([]); setSpotsLoaded(true); });
  }, [category]);

  // ── Init Mapbox ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setMapReady(true); return; }
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;
    let ro: ResizeObserver | null = null;
    let loadTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let reinitTimerId: ReturnType<typeof setTimeout> | null = null;

    const loadMapbox = (): Promise<MapboxGL> =>
      import('mapbox-gl').then((mod) => (mod.default ?? mod) as MapboxGL);

    const initMap = (container: HTMLDivElement, Mapbox: MapboxGL) => {
      if (!mounted || mapRef.current) return;
      Mapbox.accessToken = token;

      let map: mapboxgl.Map;
      try {
        map = new Mapbox.Map({
          container,
          style: MAP_STYLE,
          center: [19.5, 51.8],
          zoom: 3.5,
          minZoom: 1,
          maxZoom: 16,
          projection: { name: 'globe' } as ProjectionSpecification,
          attributionControl: false,
        });
      } catch {
        scheduleRetry(Mapbox, container, 800);
        return;
      }

      mapRef.current = map;
      let isLoaded = false;

      const canvas = map.getCanvas();
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); }, false);
      canvas.addEventListener('webglcontextrestored', () => {
        if (!mounted) return;
        if (isLoaded && mapRef.current) { mapRef.current.resize(); mapRef.current.triggerRepaint(); }
        else {
          if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
          scheduleRetry(Mapbox, container, 400);
        }
      }, false);

      map.on('error', (e) => {
        if ((e as unknown as Record<string, unknown>).tile) return;
        const status = (e?.error as { status?: number } | undefined)?.status;
        if (!mounted) return;
        if (status === 401 || status === 403) setMapError(true);
        if (!isLoaded && loadTimeoutId) { clearTimeout(loadTimeoutId); loadTimeoutId = null; }
      });

      map.on('load', () => {
        isLoaded = true;
        if (loadTimeoutId) { clearTimeout(loadTimeoutId); loadTimeoutId = null; }
        if (!mounted) return;

        try {
          map.setFog({
            color: '#0C1014', 'high-color': '#0F1E2A',
            'horizon-blend': 0.04, 'space-color': '#070A0C', 'star-intensity': 0.18,
          } as FogSpecification);
        } catch { /* style may not support fog */ }

        const overrides: Array<[string, string, string]> = [
          ['water',    'fill-color', '#0F1E2A'],
          ['waterway', 'line-color', '#133040'],
        ];
        for (const [layer, prop, val] of overrides) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (map.getLayer(layer)) map.setPaintProperty(layer, prop as any, val);
          } catch { /* layer absent */ }
        }

        map.addControl(new Mapbox.AttributionControl({ compact: true }), 'bottom-left');
        setMapReady(true);
        map.resize();
      });

      loadTimeoutId = setTimeout(() => {
        if (mounted && !isLoaded) setMapError(true);
      }, 8000);

      ro = new ResizeObserver(() => { if (mapRef.current) mapRef.current.resize(); });
      ro.observe(container);
    };

    const scheduleRetry = (Mapbox: MapboxGL, container: HTMLDivElement, delay: number) => {
      if (!mounted || retryRef.current >= MAX_RETRIES) {
        if (mounted) setMapError(true);
        return;
      }
      retryRef.current += 1;
      reinitTimerId = setTimeout(() => {
        if (!mounted || !containerRef.current) return;
        initMap(containerRef.current, Mapbox);
      }, delay);
    };

    // Give GPU 700ms to settle after Three.js forceContextLoss on navigation
    const initTimerId = setTimeout(() => {
      if (!mounted || !containerRef.current) return;
      loadMapbox()
        .then((Mapbox) => {
          if (!mounted || !containerRef.current) return;
          initMap(containerRef.current!, Mapbox);
        })
        .catch(() => { /* import failed */ });
    }, 700);

    return () => {
      mounted = false;
      clearTimeout(initTimerId);
      if (loadTimeoutId) clearTimeout(loadTimeoutId);
      if (reinitTimerId) clearTimeout(reinitTimerId);
      ro?.disconnect();
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      retryRef.current = 0;
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
          width:10px;height:10px;border-radius:50%;background:${color};
          box-shadow:0 0 0 2px rgba(${rgb},0.3),0 0 8px rgba(${rgb},0.5);
          cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;
        `;
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.8)';
          el.style.boxShadow = `0 0 0 3px rgba(${rgb},0.4),0 0 16px rgba(${rgb},0.7)`;
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
          el.style.boxShadow = `0 0 0 2px rgba(${rgb},0.3),0 0 8px rgba(${rgb},0.5)`;
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      style={{ paddingTop: '68px' }}
    >

      {/* ─── Globe ──────────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-full overflow-hidden flex-shrink-0"
        style={{ width: GLOBE_SIZE, height: GLOBE_SIZE, boxShadow: GLOBE_SHADOW }}
      >
        {token && !mapError ? (
          <div ref={containerRef} className="absolute inset-0" />
        ) : (
          <FreeTileMap spots={spots} onSelect={setSelected} />
        )}

        {/* Edge vignette — fades the globe rim into deep ocean dark */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, transparent 50%, rgba(7,10,12,0.50) 76%, rgba(7,10,12,0.92) 100%)',
          }}
        />

        {/* Loading spinner (corner-positioned inside globe) */}
        {token && !mapReady && !mapError && (
          <div className="absolute right-[19%] top-[13%] z-20 flex items-center gap-2 rounded-full border border-steel/60 bg-abyss/80 px-3 py-1.5 backdrop-blur">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border border-aurora/30 border-t-aurora" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-starGhost">
              Ładowanie...
            </span>
          </div>
        )}

        {/* Mapbox attribution — repositioned inside the circular clip area */}
        <style>{`
          .mapboxgl-ctrl-bottom-right { bottom: 22% !important; right: 20% !important; }
          .mapboxgl-ctrl-bottom-right .mapboxgl-ctrl-logo {
            filter: brightness(0.4) contrast(0.7);
            opacity: 0.5;
          }
          .mapboxgl-ctrl-bottom-left { left: 22% !important; bottom: 20% !important; }
          .mapboxgl-ctrl-bottom-left .mapboxgl-ctrl-attrib {
            background: rgba(12,16,20,0.70);
            border-radius: 6px;
            font-size: 8px;
            color: #5A5550;
          }
          .mapboxgl-ctrl-bottom-left .mapboxgl-ctrl-attrib a { color: #5A5550; }
          .mapboxgl-ctrl-bottom-left .mapboxgl-ctrl-attrib-button { display: none; }
        `}</style>
      </div>

      {/* ─── Category filters (below globe, centered) ───────────────────────── */}
      <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center px-4">
        <div className="flex flex-wrap justify-center gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setCategory(cat.value); setSelected(null); }}
              className={`rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-wide transition-all duration-150 ${
                category === cat.value
                  ? 'border-aurora bg-aurora text-void shadow-[0_0_12px_rgba(92,184,140,0.22)]'
                  : 'border-steel/60 bg-abyss/70 text-starFaint hover:border-starGhost hover:text-star'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── HUD overlay (floats top-left, overlaps globe rim) ──────────────── */}
      <div className="absolute left-4 top-[4.75rem] z-10 w-52 pointer-events-auto md:left-6 md:top-20 md:w-60">
        <div className="rounded-2xl border border-steel/60 bg-abyss/90 p-3.5 shadow-2xl shadow-void/60 backdrop-blur-xl">

          <div className="mb-2.5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-aurora/20 bg-aurora/10">
              <span className="h-2 w-2 rounded-full bg-aurora shadow-[0_0_12px_rgba(92,184,140,0.75)]" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-starGhost">
                World Map
              </p>
              <h1 className="font-display text-sm font-bold leading-none text-starlight">
                Discovery
              </h1>
            </div>
            <div className="ml-auto rounded-full border border-steel/60 bg-graphite/60 px-2 py-0.5">
              <p className="font-mono text-[8px] text-starGhost">
                {token ? 'GL' : 'OSM'}
              </p>
            </div>
          </div>

          <div className="mb-2.5 rounded-xl border border-steel/40 bg-void/30 px-2.5 py-1.5">
            <p className="font-sans text-[10px] leading-relaxed text-starFaint">
              Lokalizacje ±500m.{' '}
              <span className="text-aurora">Geo-prywatność</span> aktywna.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-steel/40 pt-2.5">
            <p className="font-mono text-[9px] text-starGhost">
              <span className="text-aurora">{spots.length}</span> odkryć
            </p>
            <Link
              href="/#join"
              className="rounded-full bg-aurora px-3 py-1.5 font-sans text-[10px] font-semibold text-void transition-all hover:brightness-110"
            >
              Dołącz →
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Token error badge ───────────────────────────────────────────────── */}
      {mapError && token && (
        <div className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2">
          <div className="rounded-2xl border border-ember/40 bg-graphite/95 px-4 py-3 text-center backdrop-blur">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ember">
              Błąd tokenu Mapbox
            </p>
            <p className="mt-1 font-sans text-xs text-starFaint">
              Sprawdź NEXT_PUBLIC_MAPBOX_TOKEN
            </p>
          </div>
        </div>
      )}

      <SpotPanel spot={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ── FreeTileMap ───────────────────────────────────────────────────────────────
function FreeTileMap({
  spots,
  onSelect,
}: {
  spots: PublicSpot[];
  onSelect: (spot: PublicSpot) => void;
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 680, height: 680 });

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
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
        x, y,
        left: size.width  / 2 + (x - center.x) * TILE_SIZE,
        top:  size.height / 2 + (y - center.y) * TILE_SIZE,
        url: `https://${['a','b','c'][Math.abs(x+y)%3]}.basemaps.cartocdn.com/dark_all/${FALLBACK_ZOOM}/${x}/${y}.png`,
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
            crossOrigin="anonymous"
            className="absolute select-none"
            style={{ left: tile.left, top: tile.top, width: TILE_SIZE, height: TILE_SIZE }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_44%,transparent_0%,rgba(7,10,12,0.18)_48%,rgba(7,10,12,0.74)_100%)]" />

      {spots.map((spot) => {
        const point = lonLatToWorld(spot.lng, spot.lat, FALLBACK_ZOOM);
        const left = size.width  / 2 + (point.x - center.x) * TILE_SIZE;
        const top  = size.height / 2 + (point.y - center.y) * TILE_SIZE;
        if (left < -20 || top < -20 || left > size.width + 20 || top > size.height + 20) return null;
        const color = CATEGORY_COLORS[spot.category] ?? '#5CB88C';
        return (
          <button
            key={spot.id}
            type="button"
            onClick={() => onSelect(spot)}
            aria-label={spot.title}
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-void transition-transform hover:scale-150"
            style={{ left, top, backgroundColor: color, boxShadow: `0 0 0 3px ${color}33, 0 0 18px ${color}88` }}
          />
        );
      })}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function lonLatToWorld(lng: number, lat: number, zoom: number): { x: number; y: number } {
  const scale  = 2 ** zoom;
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
