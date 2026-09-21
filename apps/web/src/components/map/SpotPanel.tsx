'use client';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export interface PublicSpot {
  id: string;
  title: string;
  category: string;
  lat: number;
  lng: number;
  createdAt: string;
  fuzzed: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  ABANDONED:   '◈',
  CAFE:        '◎',
  BEACH:       '◎',
  ROUTE:       '◉',
  UNDERGROUND: '◈',
  VIEWPOINT:   '◎',
  CAMP:        '◉',
};

const CATEGORY_LABELS: Record<string, string> = {
  ABANDONED:   'Opuszczone',
  CAFE:        'Kawiarnia',
  BEACH:       'Plaża',
  ROUTE:       'Trasa',
  UNDERGROUND: 'Podziemia',
  VIEWPOINT:   'Widok',
  CAMP:        'Baza',
};

interface Props {
  spot: PublicSpot | null;
  onClose: () => void;
}

export function SpotPanel({ spot, onClose }: Props): React.JSX.Element {
  return (
    <AnimatePresence>
      {spot && (
        <motion.aside
          key={spot.id}
          initial={{ x: 340, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 340, opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-[88px] right-4 bottom-4 w-80 z-10 flex flex-col pointer-events-auto"
        >
          <div className="flex-1 overflow-y-auto rounded-2xl border border-steel bg-abyss/95 backdrop-blur-xl flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-steel">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-graphite border border-steel flex items-center justify-center flex-shrink-0">
                  <span className="font-mono text-aurora text-lg">
                    {CATEGORY_ICONS[spot.category] ?? '◎'}
                  </span>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-starFaint uppercase tracking-widest">
                    {CATEGORY_LABELS[spot.category] ?? spot.category}
                  </p>
                  <h2 className="font-display text-base font-bold text-starlight leading-tight mt-0.5">
                    {spot.title}
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-starGhost hover:text-starFaint hover:bg-graphite transition-colors flex-shrink-0 ml-2"
                aria-label="Zamknij"
              >
                ✕
              </button>
            </div>

            {/* Coords */}
            <div className="p-5 border-b border-steel">
              <p className="font-mono text-[10px] text-starFaint uppercase tracking-widest mb-2">
                Współrzędne
              </p>
              <p className="font-mono text-sm text-aurora">
                {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
              </p>
              <p className="font-mono text-[10px] text-starGhost mt-1">
                ± 500m (geo-privacy)
              </p>
            </div>

            {/* Lock info */}
            <div className="p-5 flex-1">
              <div className="rounded-xl border border-ember/20 bg-ember/5 p-4 mb-4">
                <p className="font-mono text-[10px] text-ember uppercase tracking-widest mb-2">
                  Hidden Layer
                </p>
                <p className="font-sans text-xs text-star leading-relaxed">
                  Dokładna lokalizacja, historia miejsca i dostęp do zdjęć są dostępne wyłącznie
                  w aplikacji CORE dla uprawnionych Explorerów.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-mono text-[10px] text-starFaint uppercase tracking-widest">
                  Odkryte
                </p>
                <p className="font-sans text-xs text-starGhost">
                  {new Date(spot.createdAt).toLocaleDateString('pl-PL', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="p-5 border-t border-steel">
              <Link
                href="/#join"
                className="block w-full py-3 rounded-xl text-center font-sans font-semibold text-sm
                           bg-aurora/90 text-void hover:bg-aurora transition-colors duration-200"
              >
                Odblokuj w CORE →
              </Link>
              <p className="font-mono text-[10px] text-starGhost text-center mt-2">
                Sieć eksploratorów na zaproszenia
              </p>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
