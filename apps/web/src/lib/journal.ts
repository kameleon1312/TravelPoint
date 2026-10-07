export interface JournalPost {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  author: { handle: string; rank: 'NEWCOMER' | 'EXPLORER' | 'TRUSTED' | 'INSIDER' | 'LEGEND' };
  publishedAt: string;
  readingMinutes: number;
  category: 'UNDERGROUND' | 'ABANDONED' | 'ROUTE' | 'VIEWPOINT' | 'CAMP';
  terrain: string;
  accentColor: string;
  content: string; // HTML
}

export const JOURNAL_POSTS: JournalPost[] = [
  {
    slug: 'podziemna-warszawa-o-3-w-nocy',
    title: 'Podziemna Warszawa o 3 w nocy',
    subtitle: 'Zapomniane tunele pod Śródmieściem',
    excerpt:
      'Czternaście metrów pod Alejami Jerozolimskimi biegnie sieć korytarzy, o których nie ma wzmianki w żadnym oficjalnym planie miasta. Dotarliśmy tam przez zrujnowany węzeł techniczny przy Dworcu Centralnym.',
    author: { handle: 'kanal_kacper', rank: 'INSIDER' },
    publishedAt: '2026-04-12',
    readingMinutes: 7,
    category: 'UNDERGROUND',
    terrain: 'Śródmieście, Warszawa',
    accentColor: '#7A6D9E',
    content: `
<p>Wejście jest przez studzienkę w rogu parkingu przy Emilii Plater. Trzeba wiedzieć, że trzecia kratka od lewej nie jest przymocowana — ktoś, kiedyś, z rozmysłem, usunął śruby. Kto? Nie wiem. Ale jestem mu wdzięczny.</p>

<p>Schodzę z Mateuszem o 03:17. Latarki mamy czołowe, po dwie — zawsze dwie. Pierwsza zasada: nigdy nie zejdziesz z jednym źródłem światła. Jeśli bateria padnie, jesteś w kompletnej ciemności czternaście metrów pod ziemią. To nie jest abstraktem.</p>

<blockquote>„Miasto ma dwie warstwy. Jedna jest na widoku — ta dla turystów, dla Google Maps, dla ludzi którzy myślą że wiedzą gdzie są. Druga jest na dole. I ona jest prawdziwa."</blockquote>

<p>Tunel prowadzi na północ. Ściany są z cegły rozbiórkowej — tej samej, z której po wojnie odbudowywano Śródmieście. Gdzieniegdzie widać fragmenty wcześniejszej zabudowy, jakby ktoś budując nowy Dworzec po prostu <em>zabetonował</em> to co było pod spodem i poszedł dalej.</p>

<p>Po stu metrach korytarz rozwidla się. Prawo idzie w stronę metra — za tę stronę nie ręczę, bo zależy od aktualnego harmonogramu remontów i można trafić na ekipę techniczną. Lewo prowadzi głębiej, w stronę Rotundy. Idziemy lewo.</p>

<p>Mateusz zatrzymuje się przy ścianie i świeci latarką na liczby wyryte w cegle: <em>47 · WP · 1957</em>. Wydział Projektów, rok 1957. Budowali to przez dekadę po Powstaniu, zanim Pałac Kultury stał się centralnym punktem nowej Warszawy. Te tunele miały być częścią systemu łączności cywilno-militarnej. Część projektu zarzucono w 1962. Inna część — ta, w której stoimy — po prostu przestała istnieć w dokumentacji.</p>

<p>To jest to, co mnie najbardziej fascynuje w urbeksie podziemnym: nie tyle sama przestrzeń, ile to co mówi o decyzjach, które ktoś podjął za zamkniętymi drzwiami. Ktoś zdecydował że tego nie będzie. Że to będzie zakopane, zapomniane, <em>przesunięte poza granice oficjalnej rzeczywistości</em>. I tutaj to jest, trzydzieści lat po upadku systemu który to budował.</p>

<p>O 04:45 wychodzę przez tę samą kratkę. Buty mam mokre od wody gruntowej, dłonie brudne od rdzy. Na Alejach Jerozolimskich pierwsze tramwaje zaczynają jeździć. Żaden z pasażerów nie wie co jest czternaście metrów pod ich stopami.</p>

<p>Ja wiem. I to jest dość.</p>
    `,
  },

  {
    slug: 'fort-modlin-niczyja-ziemia',
    title: 'Fort Modlin: Niczyja Ziemia',
    subtitle: '200 lat historii w prawnym purgatorium',
    excerpt:
      'Fort wybudowany przez Napoleona, rozbudowany przez Rosję, użytkowany przez Wehrmacht, porzucony przez PRL. Dziś formalnie należy do Agencji Mienia Wojskowego, ale nikt nie wie co z nim zrobić. Więc stoi.',
    author: { handle: 'fortressina', rank: 'TRUSTED' },
    publishedAt: '2026-03-28',
    readingMinutes: 8,
    category: 'ABANDONED',
    terrain: 'Nowy Dwór Mazowiecki',
    accentColor: '#C86840',
    content: `
<p>Fort Modlin leży na cyplu pomiędzy Wisłą a Narwią, trzydzieści kilometrów od Warszawy. Na mapach widnieje jako "teren zamknięty". W rzeczywistości brama jest otwarta od lat — zasuwę dawno ktoś wyrwał — i jedyne co cię wita to tabliczka z wyblakłym napisem: <em>Wstęp wzbroniony. Teren wojskowy.</em></p>

<p>Ile razy byłam w twierdzach w Polsce? Czternaście. Żadna nie robi takiego wrażenia jak Modlin. Nie przez rozmiar — choć to jest ogromne, osiemdziesiąt hektarów murów, bastionów, kazamat i fossy — ale przez tę specyficzną ciszę. Cisza miejsc, które pamiętają zbyt dużo.</p>

<blockquote>„W kazamatach zachodniego bastionu znalazłam trzy warstwy graffiti. Najstarsze — cyrylica, może z lat czterdziestych. Środkowe — jakiś żołnierz z 1944 narysował mapę Niemiec z krzyżykiem nad Berlinem. Najnowsze — ktoś napisał: <em>byłem tu, 2019, Bartek W.</em> Bartek nie wiedział że pisze na ścianie którą przed nim dotknęło tysiące rąk."</blockquote>

<p>Pierwsza inspekcja zawsze jest pobieżna. Idę szybko, robię nogi, mapuję wyjścia. Fort ma sześć głównych wejść i co najmniej cztery które wchodzą w grę jako ucieczka w razie potrzeby. Potem, kiedy już wiem gdzie jestem, zaczynam naprawdę patrzeć.</p>

<p>Elewacje wschodnia i zachodnia są zachowane w przyzwoitym stanie — ktoś w latach dziewięćdziesiątych zaczął renowację, dostał dofinansowanie z Ministerstwa Kultury, a potem projekt upadł w połowie i ekipa wyjechała zostawiając rusztowania. Rusztowania stoją do dziś, porośnięte bluszczem, część już połączona z murem bardziej organicznie niż mechanicznie.</p>

<p>Na dachu głównego skrzydła rośnie las. Nie metafora — las. Brzozy, wysokie na trzy metry, korzeniami rozsadzają strop z 1812 roku. Wchodzę tam przez okno na ostatnim piętrze i przez chwilę stoję w miejscu, które jest jednocześnie dachem i polaną. Niebo jest szare, jak zwykle w październiku. Wiatr od rzeki.</p>

<p>Kiedy wychodzę, mija mnie starszy mężczyzna z psem. Patrzy na mnie. Ja patrzę na niego. On wzrusza ramionami i idzie dalej. Myślę, że jest stąd. Myślę, że wie.</p>

<p>Modlin jest na liście obiektów do rewitalizacji od 2003 roku. Przez dwadzieścia trzy lata nic się nie wydarzyło. Może kolejne dwadzieścia trzy lata też tak minie. Może las na dachu wyrośnie jeszcze wyżej.</p>
    `,
  },

  {
    slug: 'huta-szkla-laguna',
    title: 'Ostatnia Huta Szkła w Polsce',
    subtitle: 'Głuchołazy, zamknięto 2008',
    excerpt:
      'Przez osiemdziesiąt lat wytwarzała szkło okienne dla połowy kraju. Zamknęli ją w dwa tygodnie, kiedy właściciel ogłosił upadłość. Piece ostygły. Ludzie wyszli. Wszystko zostało.',
    author: { handle: 'industrial_agata', rank: 'EXPLORER' },
    publishedAt: '2026-02-15',
    readingMinutes: 6,
    category: 'ABANDONED',
    terrain: 'Głuchołazy, Opolszczyzna',
    accentColor: '#1E9AB0',
    content: `
<p>Kiedy piece hutnicze ostygają po raz ostatni, zostaje warstwa spiekanego szkła na dnie. Brązowo-zielona masa, twarda jak beton, z bąbelkami zamrożonego powietrza. W hucie w Głuchołazach ta warstwa ma grubość piętnastu centymetrów. Nikt jej nie ruszał od osiemnastu lat.</p>

<p>Hala główna ma rozmiar dwóch boisk piłkarskich. Sufity na wysokości piętnastu metrów. Światło wpada przez świetliki, część szyb dawno wybita, część — i to jest fenomen — nadal cała. Przez pęknięcia rośnie dziki bez i trawy, ale szyby jak szyby.</p>

<blockquote>„Szkło jest jednym z najtrwalszych materiałów stworzonych przez człowieka. Szkło z Pompejów istnieje do dziś. A oni zamknęli hutę szkła przez brak optymizmu co do przyszłości."</blockquote>

<p>Dokumentacja przed wejściem zajęła mi tydzień. Własność przeszła przez trzy ręce po upadłości — fundusz inwestycyjny, spółka celowa, inna spółka celowa. Każda kupowała mając plan rewitalizacji, każda plan porzucała. Obiekt jest formalnie prywatny, więc wchodzę przez zaślepiony wylot odwodnienia przy torach, bo płot od strony drogi jest zbyt wysoki i zbyt widoczny.</p>

<p>W hali narzędziowej nadal stoi stół warsztatowy z narzędziami. Klucze, pilniki, suwmiarka. Ktoś po prostu wziął kurtkę i wyszedł. Może liczył że wróci. Może wiedział że nie wróci, ale coś go powstrzymało przed zabraniem rzeczy — jakby zostawienie ich było gestem wobec miejsca. <em>To jest twoje. Zostań.</em></p>

<p>Najbardziej uderza mnie cisza. W halach przemysłowych czynnych jest zawsze hałas — prasy, wentylatory, transport. Kiedy to zamierają, cisza jest fizycznie odczuwalna jako ciężar. Jak gdyby powietrze zapamiętało wszystkie te lata hałasu i teraz trzyma to w sobie.</p>

<p>Wychodzę przez to samo wejście. Po drodze mijam stos starych harmonogramów produkcji — 2007, ostatni rok działalności. Ostatnia pozycja w sierpniowym rejestrze: <em>22 tony szkła 4mm.</em> Potem pusta strona. Potem koniec zeszytu.</p>
    `,
  },

  {
    slug: 'szlak-ktory-nie-istnieje',
    title: 'Szlak, Który Nie Istnieje',
    subtitle: 'Tatry Zachodnie, grzbietem bez nazwy',
    excerpt:
      'Między Siwarową a Błyszczem jest grzbiet, który na mapach zaznaczony jest jako niedostępny. Nie ma na nim szlaku, nie ma żadnych oznaczeń. Jest za to jeden z najpiękniejszych widoków w całych Tatrach.',
    author: { handle: 'nieznaneszlaki', rank: 'LEGEND' },
    publishedAt: '2026-01-08',
    readingMinutes: 9,
    category: 'ROUTE',
    terrain: 'Tatry Zachodnie, Polska/Słowacja',
    accentColor: '#5CB88C',
    content: `
<p>Na mapie turystycznej tego miejsca nie ma. Na map.cz jest zaznaczone jako "teren niedostępny". Na Komoot ktoś kiedyś zaznaczył punkt i opisał go jako "nie próbujcie", co oczywiście jest zaproszeniem.</p>

<p>Wychodzę ze Schroniska na Hali Ornak o 05:15. Ciemno, mróz, śnieg od wczorajszej nocy. Czołówka rzuca snop żółtego światła na biały grunt. W plecaku mam dziesięć godzin jedzenia, dwa litry wody, raki i czekan — nie dlatego że spodziewam się lodu, ale dlatego że jeśli coś pójdzie nie tak, chcę mieć opcje.</p>

<blockquote>„Najlepsze miejsca są zawsze tam, gdzie mapy mówią: tutaj kończymy dokładność. Za tym znakiem jesteś sam."</blockquote>

<p>Do Siwarowej docieram o 07:30. Standardowy szlak, nic niezwykłego. Tu odbijam w prawo, poza oznakowanie. Pierwsze sto metrów to trawa i kamień, łatwo. Potem wchodzę w strefę gdzie grunt jest ruchomy — łupek tatrzański w tym miejscu sypie się pod nogami jak groch. Każdy krok trzeba testować przed przeniesieniem ciężaru.</p>

<p>Na wysokości 2100 metrów grzbiet się wyrównuje. I wtedy widzę to pierwszy raz.</p>

<p>Na zachód: Błyszcz, Dziurawa Turnia, dalej Rohacze — trzy skalne wieże które wyglądają zupełnie inaczej stąd niż z doliny, bo widać teraz że to jest jeden masyw, jeden grzbiet, jeden ruch tektoniczny sprzed milionów lat. Na wschód: dolina Chochołowska, biała wstęga rzeki, i gdzieś daleko, za mgłą, obrys Giewontu.</p>

<p>Siedzę tam czterdzieści minut. Nikt nie przychodzi. Nikogo nie ma.</p>

<p>Zejście jest bardziej techniczne niż wejście — trzeba znaleźć właściwy żleb, bo z ruchomym łupkiem pod stopami zjazd na wprost skończyłby się źle. Wracam przez inny wariant, bardziej na południowy zachód, przez słowacką stronę gdzie przepisy są łagodniejsze wobec wędrowców z osprzętem.</p>

<p>W schronisku jest o 16:00. Kelnerka pyta skąd wróciłem. Mówię że z Siwarowej. Kiwa głową. Nie pyta dalej. Myślę, że wie.</p>

<p>To miejsce nie jest na żadnej liście. Nie ma Instagrama, nie ma recenzji, nie ma "polecanego przez eksploratorów". Kiedy będę miał pewność, że trafia w odpowiednie ręce, wrzucę to jako Secret Drop. Do tego czasu — zostaje tutaj.</p>
    `,
  },
];

export const RANK_COLORS: Record<string, string> = {
  NEWCOMER: '#5A5550',
  EXPLORER: '#C4B9AC',
  TRUSTED:  '#1E9AB0',
  INSIDER:  '#5CB88C',
  LEGEND:   '#C86840',
};
