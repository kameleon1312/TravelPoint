'use client';

import type { ReactElement } from 'react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props): ReactElement {
  return (
    <html lang="pl">
      <body style={{ margin: 0, background: '#070A0C', color: '#EDE8DF', fontFamily: 'sans-serif' }}>
        <main
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              marginBottom: 16,
              fontFamily: 'monospace',
              fontSize: 11,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#C86840',
            }}
          >
            Krytyczny błąd
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>
            TravelPoint — błąd aplikacji
          </h1>
          <p style={{ fontSize: 16, color: '#C4B9AC', maxWidth: 480, lineHeight: 1.6, marginBottom: 32 }}>
            Aplikacja napotkała nieoczekiwany błąd. Odśwież stronę lub wróć
            za chwilę.
          </p>
          {error.digest && (
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#5A5550', marginBottom: 32 }}>
              ID: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#5CB88C',
              color: '#070A0C',
              border: 'none',
              borderRadius: 999,
              padding: '12px 28px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Odśwież
          </button>
        </main>
      </body>
    </html>
  );
}
