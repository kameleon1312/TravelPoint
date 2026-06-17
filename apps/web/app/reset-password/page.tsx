'use client';

import { FormEvent, useState } from 'react';
import type { ReactElement } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function ResetPasswordPage(): ReactElement {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) return setStatus('Brak tokenu resetu.');
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    }).catch(() => null);
    setStatus(response?.ok
      ? 'Hasło zostało zmienione. Możesz zalogować się w aplikacji.'
      : 'Hasło nie spełnia wymagań albo link wygasł.');
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#070A0C] px-6 text-[#EDE8DF]">
      <form onSubmit={(event) => void submit(event)} className="w-full max-w-md rounded-xl border border-[#253035] bg-[#0C1014] p-8">
        <h1 className="mb-5 text-2xl font-bold">Nowe hasło</h1>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimum 12 znaków"
          className="mb-4 w-full rounded-lg border border-[#253035] bg-[#070A0C] px-4 py-3"
          required
        />
        <button type="submit" className="w-full rounded-lg bg-[#5CB88C] px-5 py-3 font-semibold text-[#070A0C]">
          Zmień hasło
        </button>
        {status && <p className="mt-4 text-sm text-[#C4B9AC]">{status}</p>}
      </form>
    </main>
  );
}
