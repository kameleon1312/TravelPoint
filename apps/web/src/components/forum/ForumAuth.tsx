'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { getStoredToken, signInWithPassword, clearStoredToken } from '@/lib/webAuth';

interface AuthCtx {
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx>({ token: null, signIn: async () => {}, signOut: () => {} });

export function ForumAuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getStoredToken());
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const t = await signInWithPassword(email, password);
    setToken(t);
  }, []);

  const signOut = useCallback(() => {
    clearStoredToken();
    setToken(null);
  }, []);

  return <Ctx.Provider value={{ token, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useForumAuth(): AuthCtx {
  return useContext(Ctx);
}

interface SignInModalProps {
  onClose: () => void;
}

export function SignInModal({ onClose }: SignInModalProps): ReactElement {
  const { signIn } = useForumAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd logowania');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-[#253035] bg-[#131A1F] px-4 py-3 text-sm text-[#EDE8DF] placeholder:text-[#5A5550] focus:border-[#5CB88C] focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-[#253035] bg-[#0C1014] p-8">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-[#5CB88C]">
          TravelPoint
        </p>
        <h2 className="mb-6 font-display text-2xl font-bold text-[#EDE8DF]">
          Zaloguj się
        </h2>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-[#5A5550]">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="explorer@travelpoint.app"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-[#5A5550]">Hasło</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-[#C86840]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#5CB88C] py-3 font-sans font-semibold text-[#070A0C] transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Logowanie…' : 'Zaloguj się'}
          </button>
        </form>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-center text-sm text-[#5A5550] hover:text-[#C4B9AC]"
        >
          Anuluj
        </button>
        <p className="mt-6 text-xs text-[#5A5550]">
          Forum dostępne tylko przez aplikację mobilną TravelPoint lub po zalogowaniu.
        </p>
      </div>
    </div>
  );
}
