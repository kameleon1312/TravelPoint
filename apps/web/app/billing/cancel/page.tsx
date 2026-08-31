import type { ReactElement } from 'react';
import Link from 'next/link';
import { WorldNav } from '@/components/layout/WorldNav';

export const metadata = { title: 'Płatność anulowana — TravelPoint' };

export default function BillingCancelPage(): ReactElement {
  return (
    <>
      <WorldNav />
      <main className="min-h-screen bg-abyss flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">

          <div className="w-20 h-20 rounded-full border-2 border-steel bg-graphite flex items-center justify-center mx-auto mb-8">
            <span className="text-3xl text-starGhost">◎</span>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-widest text-starFaint mb-4">
            Płatność anulowana
          </p>
          <h1 className="font-display text-3xl font-bold text-starlight mb-4">
            Wróciłeś
          </h1>
          <p className="font-sans text-sm text-star leading-relaxed mb-10">
            Nic nie zostało pobrane. Możesz wrócić do wyboru planu w dowolnym momencie —
            sieć czeka.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="rounded-xl border border-steel px-6 py-3 font-sans text-sm text-starFaint hover:border-starGhost transition"
            >
              Strona główna
            </Link>
            <Link
              href="/billing"
              className="rounded-xl bg-graphite border border-signal/40 px-6 py-3 font-sans font-semibold text-sm text-signal hover:bg-graphiteSoft transition"
            >
              Wróć do planów →
            </Link>
          </div>

        </div>
      </main>
    </>
  );
}
