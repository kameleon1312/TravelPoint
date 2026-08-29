'use client';

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '';
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '';

function parseHash(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  return Object.fromEntries(
    window.location.hash.slice(1).split('&').map((part) => part.split('=')),
  );
}

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailPage(): ReactElement {
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Potwierdzanie adresu e-mail...');

  useEffect(() => {
    const hash = parseHash();
    const accessToken = hash['access_token'] ?? null;
    const type = hash['type'] ?? '';

    if (!accessToken || type !== 'email_confirmation' && type !== 'signup') {
      setStatus('error');
      setMessage('Link jest nieprawidłowy lub wygasł. Wróć do aplikacji i spróbuj ponownie.');
      return;
    }

    // Verify the token is valid by fetching the user
    fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
      },
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus('success');
          setMessage('Adres e-mail został potwierdzony. Możesz wrócić do aplikacji.');
        } else {
          setStatus('error');
          setMessage('Link wygasł lub jest nieprawidłowy. Wróć do aplikacji i spróbuj ponownie.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Nie udało się połączyć z serwerem. Sprawdź internet i spróbuj ponownie.');
      });
  }, []);

  const icon =
    status === 'loading' ? '◌' :
    status === 'success' ? '◎' : '✕';

  const iconColor =
    status === 'loading' ? '#8A827A' :
    status === 'success' ? '#5CB88C' : '#C86840';

  return (
    <main className="grid min-h-screen place-items-center bg-[#070A0C] px-6 text-[#EDE8DF]">
      <div className="w-full max-w-lg rounded-xl border border-[#253035] bg-[#0C1014] p-8 text-center">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-[#1E9AB0]">
          TravelPoint · Weryfikacja
        </p>
        <div
          className="mb-4 text-4xl"
          style={{ color: iconColor }}
          aria-hidden
        >
          {icon}
        </div>
        <h1 className="mb-3 text-2xl font-bold tracking-tight">Weryfikacja konta</h1>
        <p className="text-[#C4B9AC]">{message}</p>
        {status === 'success' && (
          <p className="mt-4 font-mono text-[11px] text-[#5A5550]">
            Możesz zamknąć tę kartę.
          </p>
        )}
      </div>
    </main>
  );
}
