'use client';

import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { WorldNav } from '@/components/layout/WorldNav';
import { apiFetch } from '@/lib/webAuth';

interface BillingStatus {
  configured: boolean;
  tier: 'FREE' | 'PRO' | 'EXPEDITION';
  tierExpiresAt: string | null;
  customer: boolean;
}

const TIER_LABELS: Record<string, string> = {
  FREE: 'Free Explorer',
  PRO: 'Pro Explorer',
  EXPEDITION: 'Expedition',
};

const TIER_COLORS: Record<string, string> = {
  FREE: '#8A827A',
  PRO: '#1E9AB0',
  EXPEDITION: '#C8A456',
};

const TIER_ICONS: Record<string, string> = {
  FREE: '◎',
  PRO: '◈',
  EXPEDITION: '◉',
};

const PLANS = [
  {
    tier: 'PRO' as const,
    name: 'Pro Explorer',
    price: '29 PLN / mies.',
    icon: '◈',
    color: '#1E9AB0',
    perks: [
      'Nieograniczone spoty prywatne',
      'Dostęp do TRUSTED spotów',
      'Zaawansowane filtry mapy',
      'Journey route retention 90 dni',
      'Priorytetowy ranking wyszukiwania',
    ],
  },
  {
    tier: 'EXPEDITION' as const,
    name: 'Expedition',
    price: '79 PLN / mies.',
    icon: '◉',
    color: '#C8A456',
    perks: [
      'Wszystko z Pro',
      'Secret Drop tworzenie',
      'Circle founder bez limitu',
      'Journey route retention bezterminowo',
      'Explorer rank booster ×1.5',
      'Wczesny dostęp do nowych funkcji',
    ],
  },
];

export default function BillingPage(): ReactElement {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void apiFetch<BillingStatus>('/api/billing/status')
      .then((data) => { setStatus(data); setLoading(false); })
      .catch(() => { setLoading(false); setError('Zaloguj się, aby zobaczyć swój plan.'); });
  }, []);

  async function handleCheckout(tier: 'PRO' | 'EXPEDITION') {
    setCheckoutLoading(tier);
    setError('');
    try {
      const { url } = await apiFetch<{ url: string }>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier }),
      });
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'BILLING_NOT_CONFIGURED';
      if (msg.includes('BILLING_NOT_CONFIGURED') || msg === 'BILLING_NOT_CONFIGURED') {
        setError('Płatności są tymczasowo niedostępne. Wróć wkrótce.');
      } else if (msg === 'UNAUTHORIZED') {
        setError('Zaloguj się, aby przejść do płatności.');
      } else {
        setError('Błąd podczas przekierowania do płatności. Spróbuj ponownie.');
      }
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    setError('');
    try {
      const { url } = await apiFetch<{ url: string }>('/api/billing/portal', { method: 'POST' });
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('BILLING_NOT_CONFIGURED')) {
        setError('Portal płatności tymczasowo niedostępny.');
      } else if (msg.includes('CUSTOMER_NOT_FOUND')) {
        setError('Nie masz jeszcze aktywnej subskrypcji.');
      } else {
        setError('Błąd połączenia z portalem płatności.');
      }
    } finally {
      setPortalLoading(false);
    }
  }

  const tierColor = status ? (TIER_COLORS[status.tier] ?? '#8A827A') : '#8A827A';

  return (
    <>
      <WorldNav />
      <main className="min-h-screen bg-abyss pt-28 pb-24 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-12">
            <p className="eyebrow mb-4">Explorer Tier</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-starlight tracking-tight mb-4">
              Twój plan
            </h1>
            <p className="font-sans text-base text-star">
              Odblokowuj głębsze warstwy sieci i odkrywaj miejsca niedostępne dla zwykłych podróżników.
            </p>
          </div>

          {error && (
            <div className="mb-8 rounded-2xl border border-ember/30 bg-ember/5 px-5 py-4">
              <p className="font-mono text-xs text-ember">{error}</p>
            </div>
          )}

          {/* Current status */}
          {loading ? (
            <div className="mb-8 h-24 rounded-3xl border border-steel bg-graphite animate-pulse" />
          ) : status ? (
            <div
              className="mb-10 rounded-3xl border bg-graphite p-6 flex items-center justify-between gap-4"
              style={{ borderColor: tierColor + '50' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: tierColor, color: tierColor }}
                >
                  <span className="text-xl">{TIER_ICONS[status.tier] ?? '○'}</span>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest mb-0.5" style={{ color: tierColor }}>
                    Aktywny plan
                  </p>
                  <p className="font-display text-xl font-bold text-starlight">
                    {TIER_LABELS[status.tier] ?? status.tier}
                  </p>
                  {status.tierExpiresAt && (
                    <p className="font-mono text-[10px] text-starGhost mt-0.5">
                      Wygasa: {new Date(status.tierExpiresAt).toLocaleDateString('pl-PL')}
                    </p>
                  )}
                </div>
              </div>

              {/* Manage subscription */}
              {status.customer && status.tier !== 'FREE' && (
                <button
                  type="button"
                  onClick={() => void handlePortal()}
                  disabled={portalLoading}
                  className="flex-shrink-0 rounded-xl border border-steel px-4 py-2 font-mono text-xs text-starFaint hover:border-starGhost transition disabled:opacity-40"
                >
                  {portalLoading ? '...' : 'Zarządzaj'}
                </button>
              )}
            </div>
          ) : null}

          {/* Plans */}
          {(!status || status.tier === 'FREE') && (
            <div className="grid gap-4 sm:grid-cols-2">
              {PLANS.map((plan) => (
                <div
                  key={plan.tier}
                  className="rounded-3xl border bg-graphite p-6 flex flex-col"
                  style={{ borderColor: plan.color + '40' }}
                >
                  <div className="mb-5">
                    <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: plan.color }}>
                      {plan.icon} {plan.name}
                    </p>
                    <p className="font-display text-2xl font-bold text-starlight">{plan.price}</p>
                  </div>

                  <ul className="flex-1 space-y-2 mb-6">
                    {plan.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 font-sans text-xs text-star">
                        <span style={{ color: plan.color }} className="flex-shrink-0 mt-0.5">◎</span>
                        {perk}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => void handleCheckout(plan.tier)}
                    disabled={checkoutLoading !== null}
                    className="w-full rounded-xl py-3 font-sans font-semibold text-sm transition disabled:opacity-50"
                    style={{
                      backgroundColor: plan.color,
                      color: '#070A0C',
                    }}
                  >
                    {checkoutLoading === plan.tier ? 'Przekierowanie...' : `Przejdź na ${plan.name}`}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Already on paid plan */}
          {status && status.tier !== 'FREE' && (
            <div className="rounded-3xl border border-aurora/20 bg-aurora/5 p-8 text-center">
              <p className="font-mono text-xs text-aurora uppercase tracking-widest mb-3">
                Masz aktywny plan
              </p>
              <p className="font-display text-xl font-bold text-starlight mb-2">
                {TIER_LABELS[status.tier]}
              </p>
              <p className="font-sans text-sm text-starFaint mb-6">
                Dziękujemy za wsparcie sieci. Odblokujesz więcej miejsc niż przeciętny podróżnik.
              </p>
              {status.customer && (
                <button
                  type="button"
                  onClick={() => void handlePortal()}
                  disabled={portalLoading}
                  className="rounded-xl border border-aurora/40 px-6 py-3 font-sans font-semibold text-sm text-aurora hover:bg-aurora/10 transition disabled:opacity-40"
                >
                  {portalLoading ? '...' : 'Zarządzaj subskrypcją →'}
                </button>
              )}
            </div>
          )}

          <div className="mt-10 text-center">
            <p className="font-mono text-xs text-starGhost">
              Płatności obsługuje Stripe. Anuluj w dowolnym momencie.{' '}
              <Link href="/polityka-prywatnosci" className="text-starFaint hover:text-star transition">
                Polityka prywatności
              </Link>
            </p>
          </div>

        </div>
      </main>
    </>
  );
}
