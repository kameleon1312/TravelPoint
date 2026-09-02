/// <reference types="@types/google.maps" />
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { SpotPanel, type PublicSpot } from './SpotPanel';

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

const FALLBACK_ZOOM = 5;
const FALLBACK_CENTER = { lng: 19.5, lat: 51.8 };
const TILE_SIZE = 256;

const GLOBE_SIZE   = 'min(80vw, calc(100vh - 160px), 680px)';
const GLOBE_SHADOW = [
  '0 0 0 1px rgba(92,184,140,0.10)',
  '0 0 0 4px rgba(7,10,12,0.96)',
  '0 0 50px rgba(30,154,176,0.20)',
  '0 0 120px rgba(30,154,176,0.10)',
  '0 0 240px rgba(92,184,140,0.05)',
].join(', ');

// Terra Mare dark style for Google Maps — ocean floor palette, no default look
const TERRA_MARE_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',                  stylers: [{ color: '#131A1F' }] },
  { elementType: 'labels.text.stroke',        stylers: [{ color: '#0C1014' }] },
  { elementType: 'labels.text.fill',          stylers: [{ color: '#5A5550' }] },

  { featureType: 'administrative',               elementType: 'geometry',        stylers: [{ color: '#253035' }] },
  { featureType: 'administrative.country',       elementType: 'geometry.stroke', stylers: [{ color: '#253035' }] },
  { featureType: 'administrative.province',      elementType: 'geometry.stroke', stylers: [{ color: '#1B2328' }] },
  { featureType: 'administrative.locality',      elementType: 'labels.text.fill',stylers: [{ color: '#8A827A' }] },
  { featureType: 'administrative.land_parcel',   stylers:                        [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood',  stylers:                        [{ visibility: 'off' }] },

  { featureType: 'landscape',           elementType: 'geometry', stylers: [{ color: '#131A1F' }] },
  { featureType: 'landscape.natural',   elementType: 'geometry', stylers: [{ color: '#0C1014' }] },
  { featureType: 'landscape.man_made',  elementType: 'geometry', stylers: [{ color: '#131A1F' }] },

  { featureType: 'poi',   stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  { featureType: 'road',          elementType: 'geometry',        stylers: [{ color: '#1B2328' }] },
  { featureType: 'road',          elementType: 'geometry.stroke', stylers: [{ color: '#131A1F' }] },
  { featureType: 'road',          elementType: 'labels',          stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway',  elementType: 'geometry',        stylers: [{ color: '#253035' }] },
  { featureType: 'road.highway',  elementType: 'geometry.stroke', stylers: [{ color: '#1B2328' }] },
  { featureType: 'road.local',    elementType: 'labels',          stylers: [{ visibility: 'off' }] },

  { featureType: 'water', elementType: 'geometry',        stylers: [{ color: '#0F1E2A' }] },
  { featureType: 'water', elementType: 'labels.text.fill',stylers: [{ color: '#1E9AB0' }] },
  { featureType: 'water', elementType: 'labels.text.stroke',stylers: [{ color: '#0C1014' }] },
];

interface Props { token?: string }

export function DiscoveryMap({ token }: Props): React.JSX.Element {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<google.maps.Map | null>(null);
  const markersRef    = useRef<google.maps.Marker[]>([]);

  const [selected, setSelected]         = useState<PublicSpot | null>(null);
  const [spots, setSpots]               = useState<PublicSpot[]>([]);
  const [category, setCategory]         = useState('');
  const [mapReady, setMapReady]         = useState(false);
  const [mapActive, setMapActive]       = useState(false);
  const [spotsLoaded, setSpotsLoaded]   = useState(false);
  const [mapError, setMapError]         = useState(false);

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

  // ── Init Google Maps ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;

    let mounted = true;
    let idleListener: google.maps.MapsEventListener | null = null;

    const initMap = async () => {
      try {
        // v2: Loader constructor sets global options; importLibrary is a standalone fn
        const { Loader, importLibrary } = await import('@googlemaps/js-api-loader');
        new Loader({ apiKey: token, version: 'weekly' });
        await importLibrary('maps');

        if (!mounted || !containerRef.current) return;

        const map = new google.maps.Map(containerRef.current, {
          center:          { lat: 51.8, lng: 19.5 },
          zoom:            5,
          styles:          TERRA_MARE_STYLE,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          backgroundColor: '#0C1014',
          mapTypeId:       'roadmap',
          clickableIcons:  false,
          keyboardShortcuts: false,
        });

        mapRef.current = map;

        // idle fires once all tiles are loaded and map is ready
        idleListener = map.addListener('idle', () => {
          if (idleListener) {
            google.maps.event.removeListener(idleListener);
            idleListener = null;
          }
          if (!mounted) return;
          setMapReady(true);
          setMapActive(true);
        });
      } catch {
        if (mounted) setMapError(true);
      }
    };

    // 300ms — let navigation complete; Google Maps doesn't have WebGL context conflicts
    const timerId = setTimeout(() => { if (mounted) void initMap(); }, 300);

    return () => {
      mounted = false;
      clearTimeout(timerId);
      if (idleListener) {
        google.maps.event.removeListener(idleListener);
        idleListener = null;
      }
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (mapRef.current) {
        try { google.maps.event.clearInstanceListeners(mapRef.current); } catch { /* */ }
        mapRef.current = null;
      }
    };
  }, [token]);

  // ── Render markers ──────────────────────────────────────────────────────────
  const renderMarkers = useCallback(() => {
    if (!mapRef.current || !mapReady) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    spots.forEach((spot) => {
      const color = CATEGORY_COLORS[spot.category] ?? '#5CB88C';
      const marker = new google.maps.Marker({
        position: { lat: spot.lat, lng: spot.lng },
        map: mapRef.current!,
        title: spot.title,
        icon: {
          path:         google.maps.SymbolPath.CIRCLE,
          scale:        7,
          fillColor:    color,
          fillOpacity:  1,
          strokeColor:  '#070A0C',
          strokeWeight: 1.5,
        },
      });
      marker.addListener('click', () => setSelected(spot));
      markersRef.current.push(marker);
    });
  }, [spots, mapReady]);

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
        {/* FreeTileMap — immediate content, fades out when Google Maps is ready */}
        <div
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: mapActive ? 0 : 1, pointerEvents: mapActive ? 'none' : 'auto' }}
        >
          <FreeTileMap spots={spots} onSelect={setSelected} />
        </div>

        {/* Google Maps container — in DOM when API key set, fades in on idle */}
        {token && !mapError && (
          <div
            ref={containerRef}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: mapActive ? 1 : 0, zIndex: mapActive ? 1 : 0 }}
          />
        )}

        {/* Edge vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 10,
            background:
              'radial-gradient(circle at 50% 50%, transparent 50%, rgba(7,10,12,0.50) 76%, rgba(7,10,12,0.92) 100%)',
          }}
        />

        {/* Loading indicator (only while Google Maps loads in background) */}
        {token && !mapActive && !mapError && (
          <div className="absolute right-[19%] top-[13%] z-20 flex items-center gap-2 rounded-full border border-steel/60 bg-abyss/80 px-3 py-1.5 backdrop-blur">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border border-aurora/30 border-t-aurora" />
            <span className="font-mono text-[9px] uppercase tracking-widest text-starGhost">GM</span>
          </div>
        )}

        {/* Suppress Google Maps default UI chrome that leaks outside the clip circle */}
        <style>{`
          .gm-style-cc, .gmnoprint, .gm-bundled-control, .gm-svpc { display: none !important; }
          .gm-style a[href*="google.com/maps"] { opacity: 0.25 !important; pointer-events: none !important; }
        `}</style>
      </div>

      {/* ─── Category filters ───────────────────────────────────────────────── */}
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

      {/* ─── HUD overlay ────────────────────────────────────────────────────── */}
      <div className="absolute left-4 top-[4.75rem] z-10 w-52 pointer-events-auto md:left-6 md:top-20 md:w-60">
        <div className="rounded-2xl border border-steel/60 bg-abyss/90 p-3.5 shadow-2xl shadow-void/60 backdrop-blur-xl">

          <div className="mb-2.5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-aurora/20 bg-aurora/10">
              <span className="h-2 w-2 rounded-full bg-aurora shadow-[0_0_12px_rgba(92,184,140,0.75)]" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-starGhost">World Map</p>
              <h1 className="font-display text-sm font-bold leading-none text-starlight">Discovery</h1>
            </div>
            <div className="ml-auto rounded-full border border-steel/60 bg-graphite/60 px-2 py-0.5">
              <p className="font-mono text-[8px] text-starGhost">{mapActive ? 'GM' : 'OSM'}</p>
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

      {/* ─── API key error badge ─────────────────────────────────────────────── */}
      {mapError && token && (
        <div className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2">
          <div className="rounded-2xl border border-ember/40 bg-graphite/95 px-4 py-3 text-center backdrop-blur">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ember">Błąd mapy</p>
            <p className="mt-1 font-sans text-xs text-starFaint">Sprawdź NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</p>
          </div>
        </div>
      )}

      <SpotPanel spot={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ── FreeTileMap (OSM tiles — immediate content before Google Maps loads) ───────
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

  const center     = lonLatToWorld(FALLBACK_CENTER.lng, FALLBACK_CENTER.lat, FALLBACK_ZOOM);
  const centerTileX = Math.floor(center.x);
  const centerTileY = Math.floor(center.y);
  const tilesX     = Math.ceil(size.width  / TILE_SIZE / 2) + 2;
  const tilesY     = Math.ceil(size.height / TILE_SIZE / 2) + 2;
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
            className="absolute select-none"
            style={{ left: tile.left, top: tile.top, width: TILE_SIZE, height: TILE_SIZE }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_44%,transparent_0%,rgba(7,10,12,0.18)_48%,rgba(7,10,12,0.74)_100%)]" />

      {spots.map((spot) => {
        const point = lonLatToWorld(spot.lng, spot.lat, FALLBACK_ZOOM);
        const left  = size.width  / 2 + (point.x - center.x) * TILE_SIZE;
        const top   = size.height / 2 + (point.y - center.y) * TILE_SIZE;
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
