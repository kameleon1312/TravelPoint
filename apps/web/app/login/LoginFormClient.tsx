'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signInWithPassword } from '@/lib/webAuth';

export function LoginFormClient(): ReactElement {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithPassword(email, password);
      const returnUrl = params.get('returnUrl') ?? '/profile';
      router.replace(returnUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd logowania');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-starFaint">
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="twoj@email.com"
          className="w-full rounded-xl border border-steel bg-abyss px-4 py-3 text-base text-starlight placeholder:text-starGhost focus:border-aurora focus:outline-none transition-colors"
        />
      </div>
      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-starFaint">
          Hasło
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full rounded-xl border border-steel bg-abyss px-4 py-3 text-base text-starlight placeholder:text-starGhost focus:border-aurora focus:outline-none transition-colors"
        />
        <div className="mt-2 text-right">
          <Link
            href="/reset-password"
            className="font-mono text-[10px] text-starGhost hover:text-signal transition-colors"
          >
            Zapomniałem hasła
          </Link>
        </div>
      </div>
      {error && (
        <div className="rounded-xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-aurora py-3 font-sans text-sm font-semibold text-void transition-all hover:brightness-110 disabled:opacity-50"
      >
        {loading ? 'Logowanie…' : 'Zaloguj się'}
      </button>
      <p className="text-center font-sans text-sm text-starFaint">
        Nie masz konta?{' '}
        <Link href="/join" className="text-aurora hover:brightness-110 transition-all">
          Dołącz do sieci
        </Link>
      </p>
    </form>
  );
}
