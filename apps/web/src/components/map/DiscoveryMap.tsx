'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
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

interface Props {
  token: string;
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
    if (!containerRef.current || mapRef.current) return;

    let mounted = true;

    import('mapbox-gl').then((mod) => {
      if (!mounted || !containerRef.current) return;

      const Mapbox = (mod.default ?? mod) as MapboxGL;
      Mapbox.accessToken = token;

      const map = new Mapbox.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: [19.5, 51.8],
        zoom: 5.5,
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
      });

      mapRef.current = map;
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
    if (!mapRef.current || !mapReady) return;

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
  }, [spots, mapReady]);

  useEffect(() => {
    if (mapReady && spotsLoaded) renderMarkers();
  }, [mapReady, spotsLoaded, renderMarkers]);

  return (
    <div className="relative w-full h-full">
      {/* Map container */}
      <div ref={containerRef} className="absolute inset-0" />

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

      {/* Category filter */}
      {!loading && (
        <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 max-w-xs pointer-events-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setCategory(cat.value); setSelected(null); }}
              className={`px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wide border transition-all duration-150 ${
                category === cat.value
                  ? 'bg-aurora border-aurora text-void'
                  : 'bg-abyss/80 backdrop-blur-sm border-steel text-starFaint hover:border-starGhost hover:text-star'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Spot count */}
      {!loading && spots.length > 0 && (
        <div className="absolute bottom-8 left-4 z-10 pointer-events-none">
          <div className="glass rounded-xl px-3 py-2 border border-steel/50">
            <p className="font-mono text-[10px] text-starFaint">
              <span className="text-aurora">{spots.length}</span> odkryć na mapie
            </p>
          </div>
        </div>
      )}

      {/* Attribution override */}
      <style>{`
        .mapboxgl-ctrl-bottom-right { display: none; }
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

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
