'use client';

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { setStoredToken } from '@/lib/webAuth';

const SUPABASE_URL    = process.env['NEXT_PUBLIC_SUPABASE_URL']    ?? '';
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '';
const API_URL         = (process.env['NEXT_PUBLIC_API_URL'] ?? '').replace(/\/$/, '');

function parseHash(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  return Object.fromEntries(
    window.location.hash.slice(1).split('&').map((part) => {
      const eq = part.indexOf('=');
      return eq > 0
        ? [part.slice(0, eq), decodeURIComponent(part.slice(eq + 1))]
        : [part, ''];
    }),
  );
}

type Status = 'loading' | 'success' | 'success_web' | 'error';

export default function VerifyEmailPage(): ReactElement {
  const [status, setStatus]   = useState<Status>('loading');
  const [message, setMessage] = useState('Potwierdzanie adresu e-mail…');

  useEffect(() => {
    const hash = parseHash();
    const accessToken = hash['access_token'] ?? null;
    const type = hash['type'] ?? '';

    if (!accessToken || (type !== 'email_confirmation' && type !== 'signup')) {
      setStatus('error');
      setMessage('Link jest nieprawidłowy lub wygasł. Wróć do aplikacji i spróbuj ponownie.');
      return;
    }

    fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey:        SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          setStatus('error');
          setMessage('Link wygasł lub jest nieprawidłowy. Wróć do aplikacji i spróbuj ponownie.');
          return;
        }

        const user = await res.json() as {
          user_metadata?: { handle?: string; invite_code?: string };
        };

        // Check for pending signup stored by /join page
        let pendingHandle: string | undefined;
        let pendingInviteCode: string | undefined;
        try {
          const raw = sessionStorage.getItem('tp_pending_signup');
          if (raw) {
            const pending = JSON.parse(raw) as { handle?: string; inviteCode?: string };
            pendingHandle    = pending.handle;
            pendingInviteCode = pending.inviteCode;
          }
        } catch { /* */ }

        const handle     = pendingHandle    ?? user.user_metadata?.handle;
        const inviteCode = pendingInviteCode ?? user.user_metadata?.invite_code;

        if (handle) {
          // Web signup flow: store token + call complete-signup
          setStoredToken(accessToken);
          try {
            await fetch(`${API_URL}/api/auth/complete-signup`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization:  `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ handle, ...(inviteCode ? { inviteCode } : {}) }),
            });
            try { sessionStorage.removeItem('tp_pending_signup'); } catch { /* */ }
          } catch {
            // complete-signup may already have been called (e.g. via mobile), continue
          }
          setStatus('success_web');
          setTimeout(() => { window.location.href = '/profile'; }, 2000);
        } else {
          // Mobile user verifying email — just confirm, no redirect needed
          setStatus('success');
          setMessage('Adres e-mail został potwierdzony. Możesz wrócić do aplikacji.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Nie udało się połączyć z serwerem. Sprawdź internet i spróbuj ponownie.');
      });
  }, []);

  const icon =
    status === 'loading'                           ? '◌' :
    status === 'success' || status === 'success_web' ? '◎' : '✕';

  const iconColor =
    status === 'loading'                             ? '#8A827A' :
    status === 'success' || status === 'success_web' ? '#5CB88C' : '#C86840';

  return (
    <main className="grid min-h-screen place-items-center bg-[#070A0C] px-6 text-[#EDE8DF]">
      <div className="w-full max-w-lg rounded-xl border border-[#253035] bg-[#0C1014] p-8 text-center">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-[#1E9AB0]">
          TravelPoint · Weryfikacja
        </p>
        <div className="mb-4 text-4xl" style={{ color: iconColor }} aria-hidden>
          {icon}
        </div>
        <h1 className="mb-3 text-2xl font-bold tracking-tight">Weryfikacja konta</h1>
        {status === 'success_web' ? (
          <>
            <p className="text-[#C4B9AC]">
              Konto zostało aktywowane. Przekierowujemy cię do profilu…
            </p>
            <p className="mt-4 font-mono text-[11px] text-[#5A5550]">
              Jeśli nie zostaniesz przekierowany,{' '}
              <a href="/profile" className="text-[#5CB88C] hover:underline">
                kliknij tutaj
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <p className="text-[#C4B9AC]">{message}</p>
            {status === 'success' && (
              <p className="mt-4 font-mono text-[11px] text-[#5A5550]">
                Możesz zamknąć tę kartę.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
