'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';

interface AnalyticsSummary {
  period: { days: number; since: string };
  totalEvents: number;
  uniqueSessions: number;
  activeExplorers: number;
  newExplorers: number;
  topEvents: { name: string; count: number }[];
  topPaths: { path: string | null; count: number }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const PERIOD_OPTIONS = [
  { days: 1, label: '24h' },
  { days: 7, label: '7 dni' },
  { days: 30, label: '30 dni' },
  { days: 90, label: '90 dni' },
];

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#253035] bg-[#0C1014] p-6">
      <p className="mb-1 text-xs uppercase tracking-widest text-[#5A5550]">{label}</p>
      <p className="text-3xl font-bold tabular-nums text-[#EDE8DF]">{value.toLocaleString('pl-PL')}</p>
    </div>
  );
}

export default function AdminAnalyticsPage(): ReactElement {
  const [token, setToken] = useState('');
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function load(d = days) {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/analytics/summary?days=${d}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      setData(await res.json() as AnalyticsSummary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Błąd pobierania danych');
    } finally {
      setLoading(false);
    }
  }

  function changeDays(d: number) {
    setDays(d);
    void load(d);
  }

  return (
    <main className="min-h-screen bg-[#070A0C] px-6 py-12 text-[#EDE8DF]">
      <div className="mx-auto max-w-5xl">
        <a href="/admin" className="mb-6 block text-sm text-[#1E9AB0] hover:underline">
          ← Panel admina
        </a>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-[#5CB88C]">
          TravelPoint Ops
        </p>
        <h1 className="mb-8 text-3xl font-bold">Analytics</h1>

        <div className="mb-6 flex gap-3">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="JWT moderatora"
            className="min-w-0 flex-1 rounded-lg border border-[#253035] bg-[#0C1014] px-4 py-3"
          />
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-[#5CB88C] px-5 py-3 font-semibold text-[#070A0C]"
          >
            {loading ? '…' : 'Załaduj'}
          </button>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              onClick={() => changeDays(opt.days)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                days === opt.days
                  ? 'bg-[#5CB88C] text-[#070A0C]'
                  : 'border border-[#253035] text-[#C4B9AC] hover:border-[#5CB88C]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {error && <p className="mb-6 text-[#C86840]">{error}</p>}

        {data && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Zdarzenia" value={data.totalEvents} />
              <StatCard label="Sesje" value={data.uniqueSessions} />
              <StatCard label="Aktywni eksploratorzy" value={data.activeExplorers} />
              <StatCard label="Nowi eksploratorzy" value={data.newExplorers} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-xl border border-[#253035] bg-[#0C1014] p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#5CB88C]">
                  Top zdarzenia
                </h2>
                <ol className="space-y-2">
                  {data.topEvents.map((e, i) => (
                    <li key={e.name} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-3">
                        <span className="w-5 font-mono text-xs text-[#5A5550]">{i + 1}</span>
                        <span className="font-mono text-sm text-[#C4B9AC]">{e.name}</span>
                      </span>
                      <span className="tabular-nums text-sm text-[#EDE8DF]">{e.count.toLocaleString('pl-PL')}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="rounded-xl border border-[#253035] bg-[#0C1014] p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#5CB88C]">
                  Top strony
                </h2>
                <ol className="space-y-2">
                  {data.topPaths.map((e, i) => (
                    <li key={e.path ?? i} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-3">
                        <span className="w-5 font-mono text-xs text-[#5A5550]">{i + 1}</span>
                        <span className="truncate font-mono text-sm text-[#C4B9AC]">{e.path ?? '—'}</span>
                      </span>
                      <span className="tabular-nums text-sm text-[#EDE8DF]">{e.count.toLocaleString('pl-PL')}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            <p className="text-xs text-[#5A5550]">
              Dane od: {new Date(data.period.since).toLocaleString('pl-PL')} · {data.period.days} dni
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
