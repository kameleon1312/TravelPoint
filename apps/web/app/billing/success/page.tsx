import type { ReactElement } from 'react';
import Link from 'next/link';
import { WorldNav } from '@/components/layout/WorldNav';

export const metadata = { title: 'Płatność potwierdzona — TravelPoint' };

export default function BillingSuccessPage(): ReactElement {
  return (
    <>
      <WorldNav />
      <main className="min-h-screen bg-abyss flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">

          <div className="w-20 h-20 rounded-full border-2 border-aurora/40 bg-aurora/10 flex items-center justify-center mx-auto mb-8">
            <span className="text-3xl text-aurora">◉</span>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-widest text-aurora mb-4">
            Płatność potwierdzona
          </p>
          <h1 className="font-display text-3xl font-bold text-starlight mb-4">
            Dostęp odblokowany
          </h1>
          <p className="font-sans text-sm text-star leading-relaxed mb-10">
            Twój plan został aktywowany. Odkrywasz teraz głębsze warstwy sieci — spoty,
            circles i miejsca niedostępne dla zwykłych podróżników.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/billing"
              className="rounded-xl border border-steel px-6 py-3 font-sans text-sm text-starFaint hover:border-starGhost transition"
            >
              Mój plan
            </Link>
            <Link
              href="/map"
              className="rounded-xl bg-aurora px-6 py-3 font-sans font-semibold text-sm text-void hover:bg-aurora/90 transition"
            >
              Odkryj mapę →
            </Link>
          </div>

        </div>
      </main>
    </>
  );
}
