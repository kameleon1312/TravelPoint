import type { Metadata } from 'next';
import Link from 'next/link';
import { WorldNav } from '@/components/layout/WorldNav';

export const metadata: Metadata = {
  title: 'Regulamin',
  description: 'Regulamin korzystania z platformy TravelPoint.',
  robots: { index: true, follow: true },
};

export default function ReguaminPage(): React.JSX.Element {
  return (
    <>
      <WorldNav />

      <main className="min-h-screen bg-abyss pt-28 pb-24 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-12">
            <p className="font-mono text-xs text-starFaint tracking-widest uppercase mb-3">
              Dokument prawny
            </p>
            <h1 className="font-display text-4xl font-bold text-starlight tracking-tight mb-4">
              Regulamin
            </h1>
            <p className="font-sans text-sm text-starFaint">
              Obowiązuje od: 1 czerwca 2026 &nbsp;·&nbsp; Wersja 1.0
            </p>
          </div>

          {/* Content */}
          <div className="space-y-10 font-sans text-sm text-star leading-relaxed">

            <Section title="§1 Postanowienia ogólne">
              <p>1. Niniejszy Regulamin określa zasady korzystania z platformy TravelPoint, dostępnej jako aplikacja mobilna (CORE) oraz serwis internetowy (WORLD), zwanych łącznie „Platformą&quot;.</p>
              <p>2. Operatorem Platformy jest TravelPoint (&bdquo;Operator&rdquo;), prowadzący działalność zgodnie z prawem Unii Europejskiej.</p>
              <p>3. Korzystanie z Platformy oznacza akceptację niniejszego Regulaminu oraz Polityki Prywatności. Jeśli nie akceptujesz tych warunków, nie korzystaj z Platformy.</p>
              <p>4. Regulamin jest dostępny w każdym czasie pod adresem travelpoint.app/regulamin.</p>
            </Section>

            <Section title="§2 Definicje">
              <dl className="space-y-3">
                <Term term="Explorer">użytkownik posiadający konto na Platformie.</Term>
                <Term term="Spot">oznaczenie miejsca na mapie dodane przez Explorera.</Term>
                <Term term="Circle">zamknięta grupa Explorerów z dostępem na zaproszenie.</Term>
                <Term term="Transmission">wiadomość prywatna lub grupowa między Explorerami.</Term>
                <Term term="Journey">zarejestrowana trasa lub ekspedycja Explorera.</Term>
                <Term term="Secret Drop">tymczasowy, ograniczony czasowo Spot dostępny wyłącznie dla uprawnionych.</Term>
                <Term term="Rank">poziom zaufania Explorera (NEWCOMER → EXPLORER → TRUSTED → INSIDER → LEGEND) nadawany przez system na podstawie aktywności.</Term>
                <Term term="Tier">poziom subskrypcji (FREE, PRO, EXPEDITION) określający zakres dostępnych funkcji.</Term>
              </dl>
            </Section>

            <Section title="§3 Rejestracja i konto">
              <p>1. Rejestracja wymaga podania adresu e-mail, unikalnego handle oraz hasła o długości co najmniej 12 znaków.</p>
              <p>2. Platforma działa na system zaproszeń. Dostęp może wymagać kodu invite wygenerowanego przez Explorera z rankiem INSIDER lub wyższym.</p>
              <p>3. Explorer ponosi odpowiedzialność za wszystkie działania wykonane w ramach swojego konta.</p>
              <p>4. Explorer zobowiązuje się do nieprzekazywania danych logowania osobom trzecim oraz do niezwłocznego poinformowania Operatora o podejrzeniu nieuprawnionego dostępu do konta.</p>
              <p>5. Operator zastrzega sobie prawo do weryfikacji tożsamości Explorera w przypadku uzasadnionych podejrzeń naruszenia Regulaminu.</p>
            </Section>

            <Section title="§4 Zasady korzystania z Platformy">
              <p>1. Explorer zobowiązuje się do korzystania z Platformy zgodnie z jej przeznaczeniem — dzielenia się odkryciami, miejscami i doświadczeniami podróżniczymi.</p>
              <p>2. Na Platformie <strong className="text-starlight">zabronione jest</strong>:</p>
              <ul className="list-none space-y-2 pl-4">
                {[
                  'publikowanie treści naruszających prawo, prawa autorskie lub dobra osobiste osób trzecich',
                  'dodawanie Spotów na terenach prywatnych bez zgody właściciela lub w miejscach objętych zakazem wstępu',
                  'zamieszczanie treści promujących przemoc, nienawiść, dyskryminację lub działalność nielegalną',
                  'udostępnianie precyzyjnych koordynatów GPS lokalizacji chronionych (siedlisk dzikich zwierząt, stanowisk archeologicznych, prywatnych nieruchomości)',
                  'tworzenie fałszywych kont, podszywanie się pod inne osoby lub Operatora',
                  'stosowanie automatycznych narzędzi (botów, scraperów) do zbierania danych z Platformy',
                  'podejmowanie działań zakłócających funkcjonowanie Platformy (DDoS, brute-force)',
                  'odsprzedawanie lub komercyjne wykorzystywanie treści Platformy bez pisemnej zgody Operatora',
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-ember shrink-0">◈</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p>3. Operator zastrzega sobie prawo do usunięcia treści naruszających powyższe zasady bez uprzedniego powiadomienia.</p>
            </Section>

            <Section title="§5 Treści i prawa autorskie">
              <p>1. Explorer zachowuje prawa autorskie do treści, które publikuje na Platformie (opisy Spotów, zdjęcia, trasy).</p>
              <p>2. Publikując treści na Platformie, Explorer udziela Operatorowi nieodpłatnej, niewyłącznej licencji do ich wyświetlania, przechowywania i prezentowania innym Explorerom w ramach Platformy.</p>
              <p>3. Operator nie rości sobie prawa własności do treści tworzonych przez Explorerów.</p>
              <p>4. Explorer oświadcza, że posiada prawa do publikowanych treści i nie naruszają one praw osób trzecich.</p>
            </Section>

            <Section title="§6 Geo-prywatność i lokalizacja">
              <p>1. Udostępnianie lokalizacji jest zawsze dobrowolne i wymaga jawnej zgody Explorera.</p>
              <p>2. Publiczne współrzędne GPS są automatycznie zaokrąglane z dokładnością nie mniejszą niż 500 metrów (geo-fuzzing).</p>
              <p>3. Dokładne koordynaty Spotów objętych wyższym poziomem dostępu (TRUSTED, CIRCLE_ONLY, SECRET_DROP) nigdy nie są przesyłane do nieuprawnionych klientów.</p>
              <p>4. Funkcja Presence (widoczność na mapie) jest wyłączona domyślnie i może zostać włączona wyłącznie przez Explorera po udzieleniu jawnej zgody.</p>
              <p>5. Trasy GPS (Journey) są prywatne domyślnie i przechowywane w formie zaszyfrowanej.</p>
            </Section>

            <Section title="§7 Odpowiedzialność">
              <p>1. Operator nie ponosi odpowiedzialności za treści publikowane przez Explorerów.</p>
              <p>2. Operator nie gwarantuje aktualności, dokładności ani bezpieczeństwa Spotów opisywanych przez Explorerów. Eksploracja miejsc opisanych na Platformie odbywa się na własne ryzyko.</p>
              <p>3. Operator nie ponosi odpowiedzialności za szkody wynikające z odwiedzenia miejsc opisanych w Spotach, w szczególności za szkody związane z nielegalnym wejściem na teren prywatny, wypadkami lub uszkodzeniami mienia.</p>
              <p>4. Odpowiedzialność Operatora z tytułu strat majątkowych jest ograniczona do wysokości opłat uiszczonych przez Explorera w ciągu ostatnich 12 miesięcy.</p>
            </Section>

            <Section title="§8 Subskrypcje i płatności">
              <p>1. Podstawowe funkcje Platformy są dostępne bezpłatnie (Tier FREE).</p>
              <p>2. Tiers PRO i EXPEDITION są płatne i aktywowane po dokonaniu opłaty zgodnie z aktualnym cennikiem.</p>
              <p>3. Opłaty za subskrypcję są pobierane z góry na okres subskrypcji i nie podlegają zwrotowi za niewykorzystany okres, z wyjątkiem przypadków przewidzianych prawem.</p>
              <p>4. Operator zastrzega sobie prawo do zmiany cen subskrypcji z 30-dniowym wyprzedzeniem.</p>
            </Section>

            <Section title="§9 Zawieszenie i usunięcie konta">
              <p>1. Operator może zawiesić lub usunąć konto Explorera w przypadku naruszenia Regulaminu, bez wcześniejszego ostrzeżenia w przypadku ciężkich naruszeń.</p>
              <p>2. Explorer może w każdej chwili usunąć konto samodzielnie z poziomu aplikacji (Ustawienia → Usuń konto) zgodnie z art. 17 RODO.</p>
              <p>3. Po usunięciu konta dane osobowe są anonimizowane. Niektóre dane mogą być przechowywane przez okres wymagany prawem (np. dane rozliczeniowe przez 5 lat).</p>
            </Section>

            <Section title="§10 Zmiany Regulaminu">
              <p>1. Operator zastrzega sobie prawo do zmiany Regulaminu. O istotnych zmianach Explorers będą informowani drogą e-mailową z 14-dniowym wyprzedzeniem.</p>
              <p>2. Dalsze korzystanie z Platformy po wejściu w życie zmian oznacza ich akceptację.</p>
            </Section>

            <Section title="§11 Prawo właściwe i rozstrzyganie sporów">
              <p>1. Regulamin podlega prawu polskiemu i prawu Unii Europejskiej.</p>
              <p>2. Wszelkie spory będą rozstrzygane przez właściwy sąd powszechny w Polsce.</p>
              <p>3. Konsumenci z UE mogą korzystać z platformy ODR: <a href="https://ec.europa.eu/consumers/odr" className="text-signal hover:text-aurora transition-colors">ec.europa.eu/consumers/odr</a>.</p>
            </Section>

            <Section title="§12 Kontakt">
              <p>W sprawach dotyczących Regulaminu: <a href="mailto:legal@travelpoint.app" className="text-signal hover:text-aurora transition-colors">legal@travelpoint.app</a></p>
            </Section>

          </div>

          {/* Legal links */}
          <div className="mt-16 pt-8 border-t border-steel flex flex-wrap gap-6 font-mono text-xs text-starGhost">
            <Link href="/polityka-prywatnosci" className="hover:text-star transition-colors">Polityka prywatności</Link>
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
      <div className="space-y-3 text-star">{children}</div>
    </section>
  );
}

function Term({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="font-mono text-xs text-aurora uppercase tracking-wide shrink-0 pt-0.5 w-28">{term}</dt>
      <dd className="text-star">{children}</dd>
    </div>
  );
}
