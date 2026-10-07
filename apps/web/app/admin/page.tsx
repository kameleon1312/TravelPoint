'use client';

import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { getStoredToken } from '@/lib/webAuth';

interface Report {
  id: string;
  reason: string;
  details?: string | null;
  status: string;
  createdAt: string;
  reporter: { handle: string };
  targetExplorer?: { id: string; handle: string; suspendedAt?: string | null } | null;
  spot?: { id: string; title: string } | null;
  forumPost?: { id: string; title: string; slug: string } | null;
  forumReply?: { id: string; body: string; postId: string } | null;
}

interface ReportResponse {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TYPE_OPTIONS = [
  { value: '', label: 'Wszystkie' },
  { value: 'explorer', label: 'Konta' },
  { value: 'spot', label: 'Spoty' },
  { value: 'forum', label: 'Forum' },
  { value: 'transmission', label: 'Transmisje' },
];

export default function AdminPage(): ReactElement {
  const [token, setToken] = useState('');
  const [data, setData] = useState<ReportResponse | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    const stored = getStoredToken();
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (token) void loadReports(1, typeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function request(path: string, init?: RequestInit) {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
    if (!response.ok) throw new Error(`API ${response.status}`);
    return response;
  }

  async function loadReports(p = page, type = typeFilter) {
    try {
      setError('');
      const params = new URLSearchParams({ status: 'OPEN', page: String(p), limit: '20' });
      if (type) params.set('type', type);
      const response = await request(`/api/admin/reports?${params.toString()}`);
      setData(await response.json() as ReportResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Nie udało się pobrać raportów');
    }
  }

  async function resolve(report: Report) {
    await request(`/api/admin/reports/${report.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'RESOLVED', resolution: 'Resolved in operator panel' }),
    });
    await loadReports();
  }

  async function suspend(report: Report) {
    if (!report.targetExplorer) return;
    await request(`/api/admin/explorers/${report.targetExplorer.id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason: `Report ${report.id}: ${report.reason}`, reportId: report.id }),
    });
    await loadReports();
  }

  function getTarget(report: Report): string {
    if (report.targetExplorer) return `Konto: @${report.targetExplorer.handle}`;
    if (report.spot) return `Spot: ${report.spot.title}`;
    if (report.forumPost) return `Forum: ${report.forumPost.title}`;
    if (report.forumReply) return `Odpowiedź na forum (fragment: ${report.forumReply.body.slice(0, 60)}…)`;
    return 'Transmisja';
  }

  function changePage(next: number) {
    setPage(next);
    void loadReports(next, typeFilter);
  }

  function changeType(next: string) {
    setTypeFilter(next);
    setPage(1);
    void loadReports(1, next);
  }

  const reports = data?.reports ?? [];

  return (
    <main className="min-h-screen bg-[#070A0C] px-6 py-12 text-[#EDE8DF]">
      <div className="mx-auto max-w-4xl">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-[#5CB88C]">
          TravelPoint Ops
        </p>
        <h1 className="mb-2 text-3xl font-bold">Kolejka incydentów</h1>
        {data && (
          <p className="mb-6 text-sm text-[#8A827A]">
            Łącznie: {data.total} raportów · strona {data.page} / {data.pages}
          </p>
        )}

        <div className="mb-6 flex gap-3">
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="JWT moderatora"
            className="min-w-0 flex-1 rounded-lg border border-[#253035] bg-[#0C1014] px-4 py-3"
          />
          <button
            type="button"
            onClick={() => void loadReports(1, typeFilter)}
            className="rounded-lg bg-[#5CB88C] px-5 py-3 font-semibold text-[#070A0C]"
          >
            Pobierz
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => changeType(opt.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                typeFilter === opt.value
                  ? 'bg-[#5CB88C] text-[#070A0C]'
                  : 'border border-[#253035] text-[#C4B9AC] hover:border-[#5CB88C]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {error && <p className="mb-6 text-[#C86840]">{error}</p>}

        <div className="space-y-4">
          {reports.map((report) => (
            <article key={report.id} className="rounded-xl border border-[#253035] bg-[#0C1014] p-5">
              <div className="mb-3 flex items-center justify-between gap-4">
                <strong>{report.reason}</strong>
                <time className="font-mono text-xs text-[#8A827A]">
                  {new Date(report.createdAt).toLocaleString('pl-PL')}
                </time>
              </div>
              <p className="mb-2 text-sm text-[#C4B9AC]">
                Zgłasza: @{report.reporter.handle}
              </p>
              <p className="mb-2 text-sm">{getTarget(report)}</p>
              {report.forumPost && (
                <a
                  href={`/forum/${report.forumPost.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-2 block text-xs text-[#1E9AB0] underline"
                >
                  Otwórz post forum →
                </a>
              )}
              {report.details && <p className="mb-4 text-sm text-[#C4B9AC]">{report.details}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void resolve(report)}
                  className="rounded-md border border-[#5CB88C] px-4 py-2 text-sm text-[#5CB88C]"
                >
                  Zamknij raport
                </button>
                {report.targetExplorer && !report.targetExplorer.suspendedAt && (
                  <button
                    type="button"
                    onClick={() => void suspend(report)}
                    className="rounded-md border border-[#C86840] px-4 py-2 text-sm text-[#C86840]"
                  >
                    Zawieś konto
                  </button>
                )}
              </div>
            </article>
          ))}
          {reports.length === 0 && data && (
            <p className="text-center text-[#5A5550]">Brak otwartych raportów.</p>
          )}
        </div>

        {data && data.pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => changePage(page - 1)}
              className="rounded-md border border-[#253035] px-4 py-2 text-sm disabled:opacity-40"
            >
              ← Poprzednia
            </button>
            <span className="text-sm text-[#8A827A]">{page} / {data.pages}</span>
            <button
              type="button"
              disabled={page >= data.pages}
              onClick={() => changePage(page + 1)}
              className="rounded-md border border-[#253035] px-4 py-2 text-sm disabled:opacity-40"
            >
              Następna →
            </button>
          </div>
        )}

        <div className="mt-12 flex flex-wrap gap-4 border-t border-[#253035] pt-8">
          <a href="/admin/journal" className="text-sm text-[#1E9AB0] hover:underline">
            CMS Dziennika →
          </a>
          <a href="/admin/analytics" className="text-sm text-[#1E9AB0] hover:underline">
            Analytics →
          </a>
        </div>
      </div>
    </main>
  );
}
