import type { Metadata } from 'next';
import Link from 'next/link';
import { WorldNav } from '@/components/layout/WorldNav';
import { RodoRequestForm } from './RodoRequestForm';

export const metadata: Metadata = {
  title: 'Prawa RODO',
  description: 'Twoje prawa wynikające z RODO i jak je egzekwować w TravelPoint.',
  robots: { index: true, follow: true },
};

export default function RodoPage() {
  return (
    <>
      <WorldNav />

      <main className="min-h-screen bg-abyss pt-28 pb-24 px-4">
        <div className="max-w-2xl mx-auto">

          <div className="mb-12">
            <p className="font-mono text-xs text-starFaint tracking-widest uppercase mb-3">
              Rozporządzenie UE 2016/679
            </p>
            <h1 className="font-display text-4xl font-bold text-starlight tracking-tight mb-4">
              Twoje prawa RODO
            </h1>
            <p className="font-sans text-sm text-starFaint">
              Sekcja ta wyjaśnia Twoje prawa wynikające z Ogólnego Rozporządzenia o Ochronie Danych (RODO) oraz jak je egzekwować.
            </p>
          </div>

          {/* Rights grid */}
          <div className="grid gap-4 mb-12">
            {RIGHTS.map((right) => (
              <div
                key={right.title}
                className="bg-graphite border border-steel rounded-xl p-5 space-y-1"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-signal">{right.article}</span>
                  <h3 className="font-display text-sm font-semibold text-starlight">{right.title}</h3>
                </div>
                <p className="font-sans text-xs text-star leading-relaxed">{right.description}</p>
                {right.howTo && (
                  <p className="font-mono text-xs text-aurora mt-2">
                    ◎ {right.howTo}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* In-app shortcuts */}
          <div className="bg-graphite border border-steel rounded-2xl p-6 mb-12">
            <p className="font-mono text-xs text-starFaint uppercase tracking-widest mb-4">Szybki dostęp z aplikacji</p>
            <p className="font-sans text-sm text-star mb-4">
              Większość praw możesz egzekwować bezpośrednio z aplikacji mobilnej TravelPoint CORE:
            </p>
            <div className="space-y-3">
              {[
                { action: 'Eksport danych (art. 20)', path: 'Tożsamość → Prywatność i dane → Pobierz moje dane (RODO)' },
                { action: 'Usunięcie konta (art. 17)', path: 'Tożsamość → Strefa niebezpieczna → Usuń konto' },
                { action: 'Edycja danych (art. 16)', path: 'Tożsamość → Edytuj tożsamość' },
                { action: 'Wycofanie zgody GPS (art. 7)', path: 'Tożsamość → Prywatność i dane → Lokalizacja / Presence' },
              ].map((item) => (
                <div key={item.action} className="flex gap-3 items-baseline">
                  <span className="font-sans text-xs font-semibold text-starlight shrink-0 w-48">{item.action}</span>
                  <span className="font-mono text-xs text-starFaint">{item.path}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact form */}
          <div className="mb-12">
            <p className="font-mono text-xs text-starFaint uppercase tracking-widest mb-2">Wniosek do Administratora</p>
            <h2 className="font-display text-xl font-bold text-starlight mb-4">
              Wyślij wniosek RODO
            </h2>
            <p className="font-sans text-sm text-star mb-6">
              Jeśli nie możesz skorzystać z aplikacji lub chcesz skierować wniosek formalnie do Administratora, wypełnij poniższy formularz. Odpowiemy w ciągu <strong className="text-starlight">30 dni</strong> (zgodnie z art. 12 RODO).
            </p>
            <RodoRequestForm />
          </div>

          {/* DPO contact */}
          <div className="bg-midnight border border-steel rounded-2xl p-6 mb-12">
            <p className="font-mono text-xs text-starFaint uppercase tracking-widest mb-3">Kontakt z Administratorem</p>
            <div className="space-y-2 font-sans text-sm text-star">
              <p><span className="text-starFaint font-mono text-xs w-32 inline-block">E-mail:</span>
                <a href="mailto:privacy@travelpoint.app" className="text-signal hover:text-aurora transition-colors">privacy@travelpoint.app</a>
              </p>
              <p><span className="text-starFaint font-mono text-xs w-32 inline-block">Temat:</span>Wniosek RODO — [Twój @handle lub e-mail]</p>
              <p className="text-xs text-starGhost mt-3">
                Czas odpowiedzi: do 30 dni od otrzymania kompletnego wniosku.
                W uzasadnionych przypadkach termin może zostać przedłużony o kolejne 2 miesiące (art. 12 ust. 3 RODO).
              </p>
            </div>
          </div>

          {/* Supervisory authority */}
          <div className="border border-steel rounded-xl p-5 mb-12">
            <p className="font-mono text-xs text-starFaint uppercase tracking-widest mb-3">Organ nadzorczy (art. 77 RODO)</p>
            <p className="font-sans text-sm text-star mb-3">
              Masz prawo wnieść skargę do organu nadzorczego, jeśli uważasz, że przetwarzanie Twoich danych narusza RODO.
            </p>
            <div className="font-mono text-xs text-starFaint space-y-1">
              <p className="text-starlight font-sans text-sm font-semibold">Urząd Ochrony Danych Osobowych</p>
              <p>ul. Stawki 2, 00-193 Warszawa</p>
              <p>tel. 22 531 03 00</p>
              <p><a href="https://uodo.gov.pl" className="text-signal hover:text-aurora transition-colors">uodo.gov.pl</a></p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-steel flex flex-wrap gap-6 font-mono text-xs text-starGhost">
            <Link href="/regulamin" className="hover:text-star transition-colors">Regulamin</Link>
            <Link href="/polityka-prywatnosci" className="hover:text-star transition-colors">Polityka prywatności</Link>
            <Link href="/" className="hover:text-star transition-colors">← Strona główna</Link>
          </div>
        </div>
      </main>
    </>
  );
}

const RIGHTS = [
  {
    article: 'Art. 15',
    title: 'Prawo dostępu',
    description: 'Masz prawo uzyskać potwierdzenie, czy przetwarzamy Twoje dane, a jeśli tak — otrzymać ich kopię oraz informacje o celach i podstawach przetwarzania.',
    howTo: 'W aplikacji: Tożsamość → Pobierz moje dane (RODO)',
  },
  {
    article: 'Art. 16',
    title: 'Prawo do sprostowania',
    description: 'Masz prawo żądania poprawienia nieprawidłowych lub uzupełnienia niekompletnych danych osobowych.',
    howTo: 'W aplikacji: Tożsamość → Edytuj tożsamość',
  },
  {
    article: 'Art. 17',
    title: 'Prawo do usunięcia',
    description: 'Masz prawo żądania usunięcia swoich danych osobowych (prawo do bycia zapomnianym), gdy nie są już niezbędne do celów, dla których zostały zebrane.',
    howTo: 'W aplikacji: Tożsamość → Strefa niebezpieczna → Usuń konto',
  },
  {
    article: 'Art. 18',
    title: 'Prawo do ograniczenia przetwarzania',
    description: 'Masz prawo żądania ograniczenia przetwarzania danych w sytuacjach określonych w RODO (np. kwestionujesz prawidłowość danych lub sprzeciwiłeś się przetwarzaniu).',
    howTo: 'Wniosek przez formularz na tej stronie lub e-mail',
  },
  {
    article: 'Art. 20',
    title: 'Prawo do przenoszenia danych',
    description: 'Masz prawo otrzymać swoje dane w ustrukturyzowanym, powszechnie używanym formacie (JSON) i przesłać je do innego administratora.',
    howTo: 'W aplikacji: Tożsamość → Pobierz moje dane (RODO) — eksport JSON',
  },
  {
    article: 'Art. 21',
    title: 'Prawo do sprzeciwu',
    description: 'Masz prawo do wniesienia sprzeciwu wobec przetwarzania danych opartego na prawnie uzasadnionym interesie administratora, w tym profilowania.',
    howTo: 'Wniosek przez formularz na tej stronie',
  },
  {
    article: 'Art. 7 ust. 3',
    title: 'Prawo do wycofania zgody',
    description: 'W każdej chwili możesz wycofać udzieloną zgodę (np. na dostęp do GPS, Presence, push notifications). Wycofanie zgody nie wpływa na zgodność z prawem przetwarzania dokonanego przed jej wycofaniem.',
    howTo: 'W aplikacji: Tożsamość → Prywatność i dane',
  },
];
