'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { signUpWithEmail } from '@/lib/webAuth';

type Step = 'form' | 'confirm_email' | 'logged_in';

export function JoinFormClient(): ReactElement {
  const [step, setStep]           = useState<Step>('form');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [handle, setHandle]       = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (handle.length < 3 || handle.length > 24) {
      setError('Handle musi mieć od 3 do 24 znaków.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await signUpWithEmail(email, password, handle, inviteCode || undefined);
      setSubmittedEmail(email);
      setStep(result);
      if (result === 'logged_in') {
        setTimeout(() => { window.location.href = '/profile'; }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd rejestracji');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'confirm_email' || step === 'logged_in') {
    return (
      <div className="text-center py-4">
        <div className="mb-5 text-5xl text-aurora" aria-hidden>◎</div>
        <h2 className="font-display text-xl font-bold text-starlight mb-3">
          {step === 'logged_in' ? 'Witaj w sieci' : 'Sprawdź skrzynkę'}
        </h2>
        <p className="font-sans text-sm text-star leading-relaxed">
          {step === 'logged_in'
            ? 'Konto zostało aktywowane. Przekierowujemy cię do profilu…'
            : (
              <>
                Wysłaliśmy link aktywacyjny na{' '}
                <span className="text-aurora font-mono text-xs">{submittedEmail}</span>.
                {' '}Kliknij go, aby aktywować konto.
              </>
            )
          }
        </p>
        {step === 'confirm_email' && (
          <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-starGhost">
            Możesz zamknąć tę kartę
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-starFaint">
            Handle <span className="normal-case text-starGhost">(twój identyfikator w sieci)</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-starGhost">
              @
            </span>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              required
              minLength={3}
              maxLength={24}
              autoComplete="username"
              placeholder="explorer"
              className="w-full rounded-xl border border-steel bg-abyss pl-8 pr-4 py-3 text-sm text-starlight placeholder:text-starGhost focus:border-aurora focus:outline-none transition-colors"
            />
          </div>
        </div>
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
            className="w-full rounded-xl border border-steel bg-abyss px-4 py-3 text-sm text-starlight placeholder:text-starGhost focus:border-aurora focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-starFaint">
            Hasło <span className="normal-case text-starGhost">(min. 8 znaków)</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="min. 8 znaków"
            className="w-full rounded-xl border border-steel bg-abyss px-4 py-3 text-sm text-starlight placeholder:text-starGhost focus:border-aurora focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-starFaint">
            Kod zaproszenia <span className="normal-case text-starGhost">(opcjonalnie)</span>
          </label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
            autoComplete="off"
            placeholder="TP-XXXXXXXX"
            className="w-full rounded-xl border border-steel bg-abyss px-4 py-3 font-mono text-sm text-starlight placeholder:text-starGhost focus:border-aurora focus:outline-none transition-colors"
          />
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
          {loading ? 'Rejestracja…' : 'Dołącz do sieci'}
        </button>
      </form>
      <p className="mt-5 text-center font-sans text-sm text-starFaint">
        Masz już konto?{' '}
        <Link href="/login" className="text-aurora hover:brightness-110 transition-all">
          Zaloguj się
        </Link>
      </p>
    </>
  );
}
