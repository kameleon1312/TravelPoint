'use client';

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function VerifyEmailPage(): ReactElement {
  const [status, setStatus] = useState('Potwierdzanie adresu e-mail...');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('Brak tokenu weryfikacyjnego.');
      return;
    }
    void fetch(`${API_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then((response) => {
      setStatus(response.ok
        ? 'Adres e-mail został potwierdzony. Możesz wrócić do aplikacji.'
        : 'Link jest nieprawidłowy lub wygasł.');
    }).catch(() => setStatus('Nie udało się połączyć z API.'));
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#070A0C] px-6 text-[#EDE8DF]">
      <div className="max-w-lg rounded-xl border border-[#253035] bg-[#0C1014] p-8 text-center">
        <h1 className="mb-4 text-2xl font-bold">Weryfikacja konta</h1>
        <p className="text-[#C4B9AC]">{status}</p>
      </div>
    </main>
  );
}
