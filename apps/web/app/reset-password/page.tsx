'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { ReactElement } from 'react';

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '';
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? '';

function parseHash(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  return Object.fromEntries(
    window.location.hash.slice(1).split('&').map((part) => part.split('=')),
  );
}

export default function ResetPasswordPage(): ReactElement {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = parseHash();
    const token = hash['access_token'] ?? null;
    const type = hash['type'] ?? '';
    if (token && type === 'recovery') {
      setAccessToken(token);
      setReady(true);
    } else {
      setStatus('Link jest nieprawidłowy lub wygasł. Wróć do aplikacji i wygeneruj nowy.');
    }
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 12) {
      setStatus('Hasło musi mieć minimum 12 znaków.');
      return;
    }
    if (password !== confirm) {
      setStatus('Hasła nie są identyczne.');
      return;
    }
    if (!accessToken) return;

    setStatus('Zapisywanie...');
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setStatus('Hasło zostało zmienione. Możesz wrócić do aplikacji i zalogować się.');
        setReady(false);
      } else {
        const body = await res.json() as { message?: string };
        setStatus(body.message ?? 'Nie udało się zmienić hasła. Spróbuj ponownie.');
      }
    } catch {
      setStatus('Błąd połączenia. Sprawdź internet i spróbuj ponownie.');
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#070A0C] px-6 text-[#EDE8DF]">
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-md rounded-xl border border-[#253035] bg-[#0C1014] p-8"
      >
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#1E9AB0]">
          TravelPoint · Bezpieczeństwo
        </p>
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Nowe hasło</h1>

        {ready && (
          <>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#8A827A]">
              Nowe hasło
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 12 znaków"
              className="mb-4 w-full rounded-lg border border-[#253035] bg-[#070A0C] px-4 py-3 text-[#EDE8DF] placeholder:text-[#5A5550] focus:border-[#1E9AB0] focus:outline-none"
              required
              minLength={12}
              autoComplete="new-password"
            />
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-[#8A827A]">
              Powtórz hasło
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Wpisz ponownie"
              className="mb-6 w-full rounded-lg border border-[#253035] bg-[#070A0C] px-4 py-3 text-[#EDE8DF] placeholder:text-[#5A5550] focus:border-[#1E9AB0] focus:outline-none"
              required
              autoComplete="new-password"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-[#5CB88C] px-5 py-3 font-semibold text-[#070A0C] transition-opacity hover:opacity-90 active:opacity-80"
            >
              Zmień hasło
            </button>
          </>
        )}

        {status && (
          <p className={`mt-4 text-sm ${status.startsWith('Hasło zostało') ? 'text-[#5CB88C]' : 'text-[#C4B9AC]'}`}>
            {status}
          </p>
        )}
      </form>
    </main>
  );
}
