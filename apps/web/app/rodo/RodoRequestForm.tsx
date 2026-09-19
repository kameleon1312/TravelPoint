'use client';
import { useState } from 'react';

type RequestType = 'ACCESS' | 'ERASURE' | 'PORTABILITY' | 'RECTIFICATION' | 'OBJECTION' | 'RESTRICTION';

const REQUEST_TYPES: { value: RequestType; label: string; article: string }[] = [
  { value: 'ACCESS',       label: 'Dostęp do moich danych',             article: 'Art. 15' },
  { value: 'ERASURE',      label: 'Usunięcie danych (bycie zapomnianym)', article: 'Art. 17' },
  { value: 'PORTABILITY',  label: 'Przenoszenie danych (eksport JSON)',   article: 'Art. 20' },
  { value: 'RECTIFICATION',label: 'Sprostowanie nieprawidłowych danych', article: 'Art. 16' },
  { value: 'OBJECTION',    label: 'Sprzeciw wobec przetwarzania',        article: 'Art. 21' },
  { value: 'RESTRICTION',  label: 'Ograniczenie przetwarzania',          article: 'Art. 18' },
];

export function RodoRequestForm(): React.JSX.Element {
  const [email, setEmail]           = useState('');
  const [handle, setHandle]         = useState('');
  const [type, setType]             = useState<RequestType>('ACCESS');
  const [details, setDetails]       = useState('');
  const [status, setStatus]         = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setErrorMsg('Adres e-mail jest wymagany.'); setStatus('error'); return; }
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/rodo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), handle: handle.trim() || null, type, details: details.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Nie udało się wysłać wniosku. Wyślij e-mail na privacy@travelpoint.app.');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-graphite border border-aurora/20 rounded-2xl p-6 text-center">
        <p className="text-aurora text-2xl mb-2">◎</p>
        <p className="font-display text-base font-bold text-starlight mb-1">Wniosek wysłany</p>
        <p className="font-sans text-sm text-star">Odpowiemy na adres <strong>{email}</strong> w ciągu 30 dni.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Request type */}
      <div className="space-y-2">
        <label className="font-mono text-xs text-starFaint uppercase tracking-widest">Rodzaj wniosku</label>
        <div className="grid grid-cols-1 gap-2">
          {REQUEST_TYPES.map((rt) => (
            <button
              key={rt.value}
              type="button"
              onClick={() => setType(rt.value)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150 ${
                type === rt.value
                  ? 'border-aurora/60 bg-aurora/8 text-starlight'
                  : 'border-steel bg-graphite text-star hover:border-starGhost'
              }`}
            >
              <span className={`font-mono text-xs shrink-0 ${type === rt.value ? 'text-aurora' : 'text-starGhost'}`}>
                {rt.article}
              </span>
              <span className="font-sans text-sm">{rt.label}</span>
              {type === rt.value && <span className="ml-auto text-aurora">◎</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="font-mono text-xs text-starFaint uppercase tracking-widest">
          Adres e-mail <span className="text-ember">*</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="twój@email.com"
          className="w-full px-4 py-3 rounded-xl bg-graphite border border-steel text-starlight
                     font-sans text-sm placeholder-starGhost focus:outline-none focus:border-aurora
                     transition-colors duration-200"
        />
      </div>

      {/* Handle */}
      <div className="space-y-1.5">
        <label className="font-mono text-xs text-starFaint uppercase tracking-widest">
          @handle (opcjonalnie)
        </label>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          placeholder="twój_handle"
          className="w-full px-4 py-3 rounded-xl bg-graphite border border-steel text-starlight
                     font-sans text-sm placeholder-starGhost focus:outline-none focus:border-signal
                     transition-colors duration-200"
        />
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        <label className="font-mono text-xs text-starFaint uppercase tracking-widest">
          Szczegóły wniosku (opcjonalnie)
        </label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Opisz szczegóły wniosku jeśli to konieczne..."
          rows={3}
          maxLength={1000}
          className="w-full px-4 py-3 rounded-xl bg-graphite border border-steel text-starlight
                     font-sans text-sm placeholder-starGhost focus:outline-none focus:border-signal
                     transition-colors duration-200 resize-none"
        />
      </div>

      {status === 'error' && (
        <p className="font-sans text-xs text-ember">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full px-6 py-4 rounded-xl font-sans font-semibold text-sm text-void
                   bg-aurora transition-all duration-200
                   hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Wysyłanie...' : 'Wyślij wniosek RODO'}
      </button>
    </form>
  );
}
