import { Suspense } from 'react';
import type { ReactElement } from 'react';
import type { Metadata } from 'next';
import { WorldNav } from '@/components/layout/WorldNav';
import { LoginFormClient } from './LoginFormClient';

export const metadata: Metadata = {
  title: 'Zaloguj się',
  robots: { index: false, follow: false },
};

export default function LoginPage(): ReactElement {
  return (
    <>
      <WorldNav />
      <main className="flex min-h-screen items-center justify-center bg-abyss px-4 pt-20 pb-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-signal">
              TravelPoint · WORLD
            </p>
            <h1 className="font-display text-3xl font-bold text-starlight tracking-tight">
              Zaloguj się
            </h1>
            <p className="mt-2 font-sans text-sm text-starFaint">
              Wróć do sieci eksploratorów.
            </p>
          </div>
          <div className="rounded-2xl border border-steel bg-graphite p-5 sm:p-7">
            <Suspense fallback={null}>
              <LoginFormClient />
            </Suspense>
          </div>
          <p className="mt-6 text-center font-mono text-[10px] text-starGhost uppercase tracking-widest">
            Pełne doświadczenie w aplikacji CORE
          </p>
        </div>
      </main>
    </>
  );
}
