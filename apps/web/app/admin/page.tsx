'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';

interface Report {
  id: string;
  reason: string;
  details?: string | null;
  status: string;
  createdAt: string;
  reporter: { handle: string };
  targetExplorer?: { id: string; handle: string; suspendedAt?: string | null } | null;
  spot?: { id: string; title: string } | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function AdminPage(): ReactElement {
  const [token, setToken] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState('');

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

  async function loadReports() {
    try {
      setError('');
      const response = await request('/api/admin/reports?status=OPEN');
      setReports(await response.json() as Report[]);
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

  return (
    <main className="min-h-screen bg-[#070A0C] px-6 py-12 text-[#EDE8DF]">
      <div className="mx-auto max-w-4xl">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-[#5CB88C]">
          TravelPoint Ops
        </p>
        <h1 className="mb-8 text-3xl font-bold">Kolejka incydentów</h1>
        <div className="mb-8 flex gap-3">
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="JWT moderatora"
            className="min-w-0 flex-1 rounded-lg border border-[#253035] bg-[#0C1014] px-4 py-3"
          />
          <button
            type="button"
            onClick={() => void loadReports()}
            className="rounded-lg bg-[#5CB88C] px-5 py-3 font-semibold text-[#070A0C]"
          >
            Pobierz
          </button>
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
              <p className="mb-4 text-sm">
                {report.targetExplorer
                  ? `Konto: @${report.targetExplorer.handle}`
                  : report.spot
                    ? `Spot: ${report.spot.title}`
                    : 'Transmisja'}
              </p>
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
        </div>
      </div>
    </main>
  );
}
