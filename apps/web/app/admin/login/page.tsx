'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithPassword } from '@/lib/webAuth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      const returnUrl = searchParams.get('returnUrl') ?? '/admin';
      router.replace(returnUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd logowania');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-starFaint">
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full rounded-lg border border-steel bg-abyss px-4 py-2.5 text-sm text-starlight placeholder:text-starGhost focus:border-signal focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-starFaint">
          Hasło
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-steel bg-abyss px-4 py-2.5 text-sm text-starlight placeholder:text-starGhost focus:border-signal focus:outline-none"
        />
      </div>
      {error && (
        <p className="rounded-lg border border-ember/30 bg-ember/10 px-4 py-2.5 text-sm text-ember">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-aurora py-3 font-sans text-sm font-semibold text-void transition-all hover:brightness-110 disabled:opacity-50"
      >
        {loading ? 'Logowanie…' : 'Zaloguj się'}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-abyss px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-aurora">
            TravelPoint Ops
          </p>
          <h1 className="font-display text-2xl font-bold text-starlight">Panel admina</h1>
          <p className="mt-2 font-sans text-sm text-starFaint">
            Zaloguj się kontem moderatora lub admina.
          </p>
        </div>
        <div className="rounded-2xl border border-steel bg-graphite p-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
