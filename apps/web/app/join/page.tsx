import type { ReactElement } from 'react';
import type { Metadata } from 'next';
import { WorldNav } from '@/components/layout/WorldNav';
import { JoinFormClient } from './JoinFormClient';

export const metadata: Metadata = {
  title: 'Dołącz do sieci',
  description: 'Dołącz do prywatnej sieci odkrywców TravelPoint. Wymagane konto lub kod zaproszenia od istniejącego eksploratorów.',
};

export default function JoinPage(): ReactElement {
  return (
    <>
      <WorldNav />
      <main className="flex min-h-screen items-center justify-center bg-abyss px-4 pt-20 pb-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-signal">
              TravelPoint · Nowe konto
            </p>
            <h1 className="font-display text-3xl font-bold text-starlight tracking-tight">
              Dołącz do sieci
            </h1>
            <p className="mt-2 font-sans text-sm text-starFaint">
              Sieć eksploratorów. Tylko dla tych, którzy naprawdę szukają.
            </p>
          </div>
          <div className="rounded-2xl border border-steel bg-graphite p-7">
            <JoinFormClient />
          </div>
          <p className="mt-6 text-center font-mono text-[10px] text-starGhost uppercase tracking-widest">
            Pełne doświadczenie w aplikacji CORE
          </p>
        </div>
      </main>
    </>
  );
}
