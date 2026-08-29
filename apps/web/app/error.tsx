'use client';

import { useEffect } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: Props): ReactElement {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.error('[TravelPoint error]', error.digest ?? error.message);
    }
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#070A0C] px-6 text-[#EDE8DF]">
      <div className="max-w-lg text-center">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-[#C86840]">
          Błąd systemu
        </p>
        <h1 className="mb-4 font-display text-4xl font-bold tracking-tight">
          Coś poszło nie tak
        </h1>
        <p className="mb-8 font-sans text-base leading-relaxed text-[#C4B9AC]">
          Serwer zwrócił nieoczekiwany błąd. Możesz spróbować ponownie lub
          wrócić na stronę główną.
        </p>
        {error.digest && (
          <p className="mb-8 font-mono text-xs text-[#5A5550]">
            ID błędu: {error.digest}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-[#5CB88C] px-7 py-3 font-sans font-semibold text-[#070A0C] transition hover:opacity-90"
          >
            Spróbuj ponownie
          </button>
          <Link
            href="/"
            className="rounded-full border border-[#253035] px-7 py-3 font-sans font-medium text-[#C4B9AC] transition hover:border-[#5CB88C]"
          >
            Strona główna
          </Link>
        </div>
      </div>
    </main>
  );
}
