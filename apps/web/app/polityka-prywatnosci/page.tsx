import type { Metadata } from 'next';
import Link from 'next/link';
import { WorldNav } from '@/components/layout/WorldNav';

export const metadata: Metadata = {
  title: 'Polityka Prywatności',
  description: 'Polityka prywatności i ochrony danych osobowych w TravelPoint.',
  robots: { index: true, follow: true },
};

export default function PolitykaPrywatnosci(): React.JSX.Element {
  return (
    <>
      <WorldNav />

      <main className="min-h-screen bg-abyss pt-28 pb-24 px-4">
        <div className="max-w-2xl mx-auto">

          <div className="mb-12">
            <p className="font-mono text-xs text-starFaint tracking-widest uppercase mb-3">
              Ochrona danych
            </p>
            <h1 className="font-display text-4xl font-bold text-starlight tracking-tight mb-4">
              Polityka Prywatności
            </h1>
            <p className="font-sans text-sm text-starFaint">
              Obowiązuje od: 1 czerwca 2026 &nbsp;·&nbsp; Wersja 1.0 &nbsp;·&nbsp;
              Zgodna z RODO (Rozporządzenie UE 2016/679)
            </p>
          </div>

          <div className="space-y-10 font-sans text-sm text-star leading-relaxed">

            <Section title="1. Administrator danych">
              <p>Administratorem Twoich danych osobowych jest TravelPoint, operator Platformy dostępnej pod adresem travelpoint.app.</p>
              <p>Kontakt w sprawach ochrony danych: <a href="mailto:privacy@travelpoint.app" className="text-signal hover:text-aurora transition-colors">privacy@travelpoint.app</a></p>
            </Section>

            <Section title="2. Jakie dane zbieramy">
              <p>Zbieramy dane, które sam podajesz, oraz dane generowane automatycznie:</p>

              <SubTitle>Dane podawane przez Ciebie</SubTitle>
              <DataList items={[
                ['Adres e-mail', 'rejestracja, komunikacja'],
                ['Handle (pseudonim)', 'identyfikacja w sieci'],
                ['Hasło', 'przechowywane w formie skrótu Argon2id — nigdy jawnie'],
                ['Imię wyświetlane, bio, archetype', 'opcjonalne dane profilowe'],
                ['Obsesje, terytoria', 'tagi zainteresowań (opcjonalne)'],
                ['Treści Spotów i Journeys', 'dodawane dobrowolnie'],
                ['Zdjęcia', 'przypisane do Spotów (URL lub data URI)'],
                ['Wiadomości (Transmissions)', 'komunikacja z innymi Explorerami'],
              ]} />

              <SubTitle>Dane zbierane automatycznie</SubTitle>
              <DataList items={[
                ['Dane urządzenia', 'typ, system operacyjny, token push notifications (opcjonalnie)'],
                ['Logi dostępu', 'data/godzina, adres IP (zanonimizowany), endpoint API'],
                ['Koordynaty GPS', 'wyłącznie po udzieleniu zgody, zawsze fuzzowane ≥500m przed publikacją'],
                ['Trasy GPS (Journey)', 'szyfrowane, nigdy nie eksportowane bez Twojej zgody'],
              ]} />
            </Section>

            <Section title="3. Podstawy prawne przetwarzania (art. 6 RODO)">
              <DataList items={[
                ['Art. 6(1)(b)', 'wykonanie umowy — świadczenie usług Platformy'],
                ['Art. 6(1)(a)', 'zgoda — lokalizacja GPS, Presence na mapie, push notifications'],
                ['Art. 6(1)(c)', 'obowiązek prawny — przechowywanie danych rozliczeniowych, logi audytowe'],
                ['Art. 6(1)(f)', 'prawnie uzasadniony interes — bezpieczeństwo Platformy, wykrywanie nadużyć'],
              ]} />
            </Section>

            <Section title="4. Cel i zakres przetwarzania">
              <DataList items={[
                ['Świadczenie usług', 'tworzenie konta, uwierzytelnianie, dostęp do Platformy'],
                ['Funkcje społecznościowe', 'Circles, Transmissions, Signals — komunikacja między Explorerami'],
                ['Mapa i Spoty', 'wyświetlanie, filtrowanie, dostęp do Spotów zgodny z poziomem uprawnień'],
                ['Rank i zaufanie', 'obliczanie TrustScore i Rank Explorera'],
                ['Push notifications', 'powiadomienia o nowych Transmissions i Signals (za zgodą)'],
                ['Bezpieczeństwo', 'logi audytowe, wykrywanie nieuprawnionych dostępów, ochrona przed atakami'],
                ['Komunikacja marketingowa', 'wyłącznie e-mail z zaproszeniami do sieci i ważnymi informacjami o Platformie'],
                ['RODO / compliance', 'prowadzenie rejestru zgód, obsługa wniosków o usunięcie/eksport danych'],
              ]} />
            </Section>

            <Section title="5. Lokalizacja i geo-prywatność">
              <p>Ochrona danych lokalizacyjnych jest priorytetem:</p>
              <ul className="space-y-2 pl-4">
                {[
                  'Dostęp do GPS jest zawsze opt-in — domyślnie wyłączony.',
                  'Publiczne koordynaty są automatycznie rozmywane o co najmniej 500 metrów (geo-fuzzing per-sesja).',
                  'Dokładna lokalizacja Spotów chronionych (TRUSTED, CIRCLE_ONLY, SECRET_DROP) NIGDY nie jest przesyłana do nieuprawnionych klientów — weryfikacja odbywa się wyłącznie po stronie serwera.',
                  'Dane GPS nie są nigdy logowane ani przechowywane w logach.',
                  'Trasy Journey są zaszyfrowane i nigdy nie pojawiają się w eksporcie danych bez Twojej jawnej akcji.',
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-aurora shrink-0">◉</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="6. Odbiorcy danych">
              <p>Twoje dane osobowe nie są sprzedawane. Możemy je przekazywać wyłącznie:</p>
              <DataList items={[
                ['Resend (Stytch Inc.)', 'dostarczanie e-maili transakcyjnych — USA, Standard Contractual Clauses'],
                ['Expo (650 Industries Inc.)', 'dostarczanie push notifications — USA, SCC'],
                ['Dostawcy infrastruktury', 'serwery w UE (PostgreSQL, Redis)'],
                ['Organy prawne', 'wyłącznie na podstawie prawomocnego nakazu sądowego'],
              ]} />
            </Section>

            <Section title="7. Okres przechowywania">
              <DataList items={[
                ['Dane konta', 'do usunięcia konta + 30 dni na potrzeby anonimizacji'],
                ['Dane rozliczeniowe', '5 lat od transakcji (obowiązek podatkowy)'],
                ['Logi audytowe (RODO)', '3 lata (uzasadniony interes — compliance)'],
                ['Logi dostępu (bezpieczeństwo)', '90 dni, potem automatyczne usunięcie'],
                ['Trasy GPS (Journey)', 'do usunięcia przez Explorera lub usunięcia konta'],
              ]} />
            </Section>

            <Section title="8. Twoje prawa">
              <p>Jako osoba, której dane dotyczą, przysługują Ci prawa opisane szczegółowo na stronie <Link href="/rodo" className="text-signal hover:text-aurora transition-colors">travelpoint.app/rodo</Link>:</p>
              <ul className="space-y-1 pl-4">
                {[
                  'Prawo dostępu do danych (art. 15 RODO)',
                  'Prawo do sprostowania (art. 16)',
                  'Prawo do usunięcia („prawo do bycia zapomnianym") (art. 17)',
                  'Prawo do ograniczenia przetwarzania (art. 18)',
                  'Prawo do przenoszenia danych (art. 20)',
                  'Prawo do sprzeciwu (art. 21)',
                  'Prawo do wycofania zgody (art. 7 ust. 3)',
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-aurora shrink-0">◎</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p>Eksport i usunięcie danych możliwe bezpośrednio z aplikacji mobilnej (Tożsamość → Prywatność i dane).</p>
            </Section>

            <Section title="9. Bezpieczeństwo">
              <p>Stosujemy następujące środki techniczne ochrony danych:</p>
              <ul className="space-y-2 pl-4">
                {[
                  'Hasła hashowane algorytmem Argon2id z unikalną solą',
                  'Tokeny JWT z krótkim czasem ważności (15 minut) z mechanizmem rotacji',
                  'Szyfrowanie transmisji (TLS 1.3)',
                  'Rate limiting na wszystkich endpointach uwierzytelniania',
                  'Ochrona przed timing attacks przy weryfikacji haseł',
                  'Tokeny refresh przechowywane jako skróty kryptograficzne',
                  'Kompleksowy log audytowy wszystkich operacji na danych osobowych',
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-signal shrink-0">◈</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="10. Pliki cookie">
              <p>Serwis internetowy WORLD (travelpoint.app) używa wyłącznie technicznych plików cookie niezbędnych do działania (sesja, preferencje). Nie stosujemy śledzących plików cookie ani zewnętrznych pikseli analitycznych.</p>
            </Section>

            <Section title="11. Skargi">
              <p>Masz prawo wnieść skargę do organu nadzorczego. W Polsce jest nim:</p>
              <p className="font-mono text-xs text-starFaint">
                Urząd Ochrony Danych Osobowych<br />
                ul. Stawki 2, 00-193 Warszawa<br />
                <a href="https://uodo.gov.pl" className="text-signal hover:text-aurora transition-colors">uodo.gov.pl</a>
              </p>
            </Section>

            <Section title="12. Zmiany polityki">
              <p>O istotnych zmianach niniejszej Polityki będziemy informować drogą e-mailową z 14-dniowym wyprzedzeniem.</p>
            </Section>

          </div>

          <div className="mt-16 pt-8 border-t border-steel flex flex-wrap gap-6 font-mono text-xs text-starGhost">
            <Link href="/regulamin" className="hover:text-star transition-colors">Regulamin</Link>
            <Link href="/rodo" className="hover:text-star transition-colors">Prawa RODO</Link>
            <Link href="/" className="hover:text-star transition-colors">← Strona główna</Link>
          </div>
        </div>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-base font-semibold text-starlight tracking-tight border-b border-steel pb-2">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs text-aurora uppercase tracking-widest mt-4 mb-2">{children}</p>
  );
}

function DataList({ items }: { items: [string, string][] }) {
  return (
    <dl className="space-y-2">
      {items.map(([term, desc]) => (
        <div key={term} className="flex gap-3 items-baseline">
          <dt className="font-mono text-xs text-starFaint shrink-0 w-44">{term}</dt>
          <dd className="text-star">{desc}</dd>
        </div>
      ))}
    </dl>
  );
}
