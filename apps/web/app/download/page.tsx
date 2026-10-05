import type { ReactElement } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { WorldNav } from '@/components/layout/WorldNav';

export const metadata: Metadata = {
  title: 'Pobierz aplikację',
  description: 'Pobierz TravelPoint CORE na Androida. Ukryte miejsca, kręgi eksploratorów, nagrywanie tras — pełne doświadczenie w aplikacji mobilnej.',
};

// Falls back to a file served from apps/web/public/ — drop travelpoint-core.apk there.
// Override with NEXT_PUBLIC_APK_URL env var to point to an external CDN.
const APK_URL = process.env['NEXT_PUBLIC_APK_URL'] ?? '/travelpoint-core.apk';

const INSTALL_STEPS = [
  {
    step: '01',
    label: 'Pobierz plik APK',
    desc: 'Kliknij przycisk "Pobierz APK" i zapisz plik na telefonie.',
  },
  {
    step: '02',
    label: 'Zezwól na instalację',
    desc: 'W ustawieniach Androida przejdź do Bezpieczeństwo → włącz "Instalacja z nieznanych źródeł" lub "Inne źródła".',
  },
  {
    step: '03',
    label: 'Otwórz i zainstaluj',
    desc: 'Znajdź pobrany plik .apk w Menedżerze plików i zaakceptuj instalację.',
  },
  {
    step: '04',
    label: 'Zaloguj się i odkrywaj',
    desc: 'Uruchom aplikację, zaloguj się lub utwórz konto i dołącz do sieci.',
  },
];

export default function DownloadPage(): ReactElement {
  return (
    <>
      <WorldNav />
      <main className="min-h-screen bg-abyss pt-24 pb-24 px-4">

        {/* ── Hero ────────────────────────────────────────────────────────────── */}
        <section className="max-w-2xl mx-auto text-center mb-20">
          <p className="eyebrow mb-5">TravelPoint CORE</p>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-starlight tracking-tight mb-6">
            Aplikacja mobilna
          </h1>
          <p className="font-sans text-base md:text-lg text-star leading-relaxed max-w-lg mx-auto mb-3">
            Pełna sieć eksploratorów w kieszeni. Ukryte miejsca, kręgi, journeys, transmisje — tylko w CORE.
          </p>
          <p className="font-mono text-xs text-starFaint uppercase tracking-widest">
            React Native · Expo · iOS & Android
          </p>
        </section>

        {/* ── Download cards ──────────────────────────────────────────────────── */}
        <section className="max-w-lg mx-auto mb-20 space-y-4">

          {/* Android APK — primary */}
          <div className="rounded-2xl border border-aurora/30 bg-aurora/5 p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-aurora/10 border border-aurora/20 flex items-center justify-center flex-shrink-0">
                <span className="font-mono text-aurora text-xl">▲</span>
              </div>
              <div>
                <p className="font-display text-base font-bold text-starlight mb-1">
                  Android — Sideload APK
                </p>
                <p className="font-sans text-xs text-star leading-relaxed">
                  Bezpośrednia instalacja bez pośrednictwa Google Play.
                  Wymaga jednorazowego zezwolenia na instalację z zewnętrznych źródeł.
                </p>
              </div>
            </div>
            <a
              href={APK_URL}
              download
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-aurora font-sans text-sm font-semibold text-void transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <span>Pobierz APK</span>
              <span className="font-mono text-[11px] opacity-70">↓</span>
            </a>
          </div>

          {/* iOS TestFlight — secondary */}
          <div className="rounded-2xl border border-steel bg-graphite/50 p-6 opacity-60">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-graphite border border-steel flex items-center justify-center flex-shrink-0">
                <span className="font-mono text-starGhost text-xl">◎</span>
              </div>
              <div>
                <p className="font-display text-base font-bold text-starFaint mb-1">
                  iOS — TestFlight
                </p>
                <p className="font-sans text-xs text-starGhost leading-relaxed">
                  Beta dostępna wkrótce przez TestFlight. Aplikacja w procesie certyfikacji Apple.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center w-full py-3.5 rounded-xl border border-steel/50 font-sans text-sm text-starGhost cursor-not-allowed select-none">
              TestFlight
              <span className="font-mono text-[10px] uppercase tracking-wider ml-2">Wkrótce</span>
            </div>
          </div>

          {/* App Store + Play Store — grayed out */}
          <div className="grid grid-cols-2 gap-3">
            {([
              { icon: '◈', label: 'App Store',    sub: 'iPhone & iPad' },
              { icon: '◉', label: 'Google Play',  sub: 'Android' },
            ] as const).map(({ icon, label, sub }) => (
              <div
                key={label}
                className="rounded-2xl border border-steel/40 bg-graphite/30 p-4 flex items-center gap-3 opacity-35 cursor-not-allowed select-none"
              >
                <span className="font-mono text-starGhost text-xl flex-shrink-0">{icon}</span>
                <div>
                  <p className="font-sans text-xs font-semibold text-starFaint">{label}</p>
                  <p className="font-mono text-[9px] text-starGhost">{sub}</p>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-starGhost mt-0.5">Wkrótce</p>
                </div>
              </div>
            ))}
          </div>

        </section>

        {/* ── APK install guide ───────────────────────────────────────────────── */}
        <section className="max-w-lg mx-auto mb-20">
          <h2 className="font-display text-xl font-bold text-starlight mb-2 text-center">
            Jak zainstalować APK?
          </h2>
          <p className="font-sans text-sm text-starFaint text-center mb-8">
            Android · Sideloading · ok. 3 minuty
          </p>
          <div className="space-y-3">
            {INSTALL_STEPS.map(({ step, label, desc }) => (
              <div
                key={step}
                className="flex gap-4 items-start rounded-2xl border border-steel bg-graphite px-5 py-4"
              >
                <span className="font-mono text-[11px] text-aurora tracking-wider flex-shrink-0 mt-0.5 w-6">
                  {step}
                </span>
                <div>
                  <p className="font-sans text-sm font-semibold text-starlight mb-0.5">{label}</p>
                  <p className="font-sans text-xs text-starFaint leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
        <section className="max-w-sm mx-auto text-center">
          <p className="font-sans text-sm text-starFaint mb-5">
            Nie masz jeszcze konta w sieci?
          </p>
          <Link
            href="/join"
            className="inline-block px-8 py-3.5 rounded-xl bg-aurora font-sans text-sm font-semibold text-void transition-all hover:brightness-110"
          >
            Dołącz do sieci
          </Link>
          <p className="mt-5 font-mono text-[10px] uppercase tracking-widest text-starGhost">
            Sieć eksploratorów · tylko na zaproszenie
          </p>
        </section>

      </main>
    </>
  );
}
