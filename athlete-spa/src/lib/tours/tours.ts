import type { TourDef } from './types';

/**
 * First-run tours, one per screen. Each explains only what is not obvious from
 * the screen itself: what a colour or ring means, what a tap leads to, where a
 * less visible action hides. Keep steps short; a tour is read standing in a gym.
 *
 * Steps point at `data-tour="…"` attributes in the screens. A step whose
 * element is missing is skipped, so the list can cover states (a trainer's
 * plan, a connected Strava) that only some accounts have.
 */

const at = (path: string) => (pathname: string) => pathname === path;

export const TOURS: TourDef[] = [
  {
    id: 'dashboard',
    version: 1,
    match: at('/athlete/dashboard'),
    steps: [
      {
        title: 'Witaj w Leniwej Klusce',
        body: 'W pół minuty pokażemy Ci, co gdzie jest. Każdy nowy ekran przedstawi się sam przy pierwszym wejściu, a wskazówki wyłączysz w Ustawieniach.',
      },
      {
        target: 'week-strip',
        title: 'Twój tydzień',
        body: 'Limonkowe kółko to zrobiony trening, pomarańczowa obwódka to zaplanowany. Dotknij paska, aby otworzyć kalendarz.',
      },
      {
        target: 'today-hero',
        title: 'Najbliższy krok',
        body: 'Ta karta zawsze podpowiada, co teraz: zaplanowany trening, sesję w toku albo szybki start nowej.',
      },
      {
        target: 'dashboard-daily-goals',
        title: 'Cele dnia',
        body: 'Trening, jedzenie i nawyki w jednym miejscu. Pierścienie wypełniają się w ciągu dnia, a dotknięcie wiersza przenosi do szczegółów.',
      },
      {
        target: 'tab-bar',
        title: 'Główne zakładki',
        body: 'Dziś, Trening, Dieta, Ekipa i Twój profil są zawsze pod kciukiem. Wszystkie pozostałe ekrany i wyszukiwarkę znajdziesz w <strong>Menu</strong>.',
      },
      {
        target: 'quick-add',
        title: 'Szybkie dodawanie',
        body: 'Plus zapisuje to, co robisz najczęściej: trening, bieg, posiłek, wagę, pomiary albo nowy cel. Działa z każdego ekranu.',
      },
      {
        target: 'header-actions',
        title: 'Powiadomienia, czat, ustawienia',
        body: 'Dzwonek zbiera nowości, dymek otwiera rozmowy, a zębatka prowadzi do ustawień aplikacji.',
      },
      {
        target: 'dashboard-customize',
        title: 'Ułóż ekran po swojemu',
        body: 'Zmień kolejność sekcji albo ukryj te, z których nie korzystasz. Układ zapisuje się na tym urządzeniu.',
      },
    ],
  },
  {
    id: 'log',
    version: 1,
    // The session itself (`?logId=`) is not interrupted: its elements are absent, so nothing starts.
    match: (pathname, search) => pathname === '/athlete/log' && !search.has('logId'),
    steps: [
      {
        target: 'log-quick-start',
        title: 'Zacznij od razu',
        body: 'Pusty trening budujesz w trakcie, dodając ćwiczenia po kolei. Bieg uruchamia zapis trasy z GPS.',
      },
      {
        target: 'log-recovery',
        title: 'Regeneracja mięśni',
        body: 'Mapa liczona z Twoich ostatnich treningów: pokazuje, które partie jeszcze odpoczywają, a które są gotowe na kolejny bodziec.',
      },
      {
        target: 'log-recent',
        title: 'Powtórz trening',
        body: 'Dotknij karty, aby podejrzeć ćwiczenia z poprzedniej sesji i uruchomić ją jeszcze raz.',
      },
      {
        target: 'log-templates',
        title: 'Szablony',
        body: 'Gotowe treningi do uruchomienia jednym dotknięciem. Własne stworzysz i poprawisz w <strong>Zarządzaj</strong>.',
      },
      {
        target: 'log-plans',
        title: 'Plany',
        body: 'Programy rozpisane na tygodnie, także te od trenera. Otwórz plan, aby zobaczyć kolejne treningi.',
      },
    ],
  },
  {
    id: 'diet',
    version: 1,
    match: at('/athlete/diet'),
    steps: [
      {
        target: 'diet-hero',
        title: 'Twój jadłospis',
        body: 'Tu mieszka plan diety od trenera, rozpisany na dni i posiłki. Bez planu też skorzystasz z przepisów i dzienniczka.',
      },
      {
        target: 'diet-diary',
        title: 'Dzisiejszy bilans',
        body: 'Kalorie zjedzone dziś na tle celu. Dotknij, aby otworzyć dzienniczek i dopisać posiłek.',
      },
      {
        target: 'diet-days',
        title: 'Dni planu',
        body: 'Przełączaj dni, aby zobaczyć ich posiłki. Zjedzony posiłek dodasz do dzienniczka przyciskiem na jego karcie.',
      },
      {
        target: 'diet-recipes',
        title: 'Przepisy',
        body: 'Dania z policzonymi kaloriami i makro. Plus na kafelku dodaje danie do Twojego jadłospisu.',
      },
    ],
  },
  {
    id: 'nutrition',
    version: 1,
    match: at('/athlete/nutrition'),
    steps: [
      {
        target: 'nutrition-day',
        title: 'Dzień po dniu',
        body: 'Strzałki przewijają dni, a dotknięcie daty wraca do dzisiaj. Możesz uzupełnić także wczorajsze posiłki.',
      },
      {
        target: 'nutrition-summary',
        title: 'Bilans dnia',
        body: 'Ile kalorii zostało do celu oraz jak idzie białko, węglowodany i tłuszcz.',
      },
      {
        target: 'nutrition-meal',
        title: 'Dodawanie jedzenia',
        body: 'Plus przy posiłku otwiera wyszukiwarkę produktów i dań. Jest tam też skaner kodów kreskowych i ręczne wpisywanie wartości.',
      },
    ],
  },
  {
    id: 'social',
    version: 1,
    match: at('/athlete/social'),
    steps: [
      {
        target: 'social-tabs',
        title: 'Trzy widoki ekipy',
        body: '<strong>Znajomi</strong> to treningi, biegi i statusy osób, które znasz. <strong>Odkrywaj</strong> pokazuje zdjęcia społeczności, a w <strong>Ludziach</strong> czekają zaproszenia i osoby z okolicy.',
      },
      {
        target: 'social-composer',
        title: 'Daj znać, co u Ciebie',
        body: 'Krótki status trafia do znajomych razem z Twoimi treningami i celami.',
      },
    ],
  },
  {
    id: 'menu',
    version: 1,
    match: at('/athlete/menu'),
    steps: [
      {
        target: 'menu-search',
        title: 'Szukaj zamiast przewijać',
        body: 'Wpisz nazwę ekranu albo to, co chcesz zrobić, np. „waga”, „strava” czy „motyw”, a przejdziesz tam od razu.',
      },
      {
        target: 'menu-shortcuts',
        title: 'Szybki dostęp',
        body: 'Ekrany, które ostatnio otwierasz, zawsze na górze. Lista dopasowuje się do Ciebie z czasem.',
      },
      {
        target: 'menu-directory',
        title: 'Wszystkie ekrany',
        body: 'Reszta aplikacji pogrupowana tematycznie. Kolor ikony jest ten sam co kolor działu w całej aplikacji.',
      },
    ],
  },
  {
    id: 'you',
    version: 1,
    match: at('/athlete/you'),
    steps: [
      {
        target: 'you-hero',
        title: 'Twoja wizytówka',
        body: 'Zdjęcie, poziom i najważniejsze liczby. Pierścień wokół zdjęcia pokazuje, ile XP brakuje do kolejnego poziomu.',
      },
      {
        target: 'you-profile',
        title: 'Twój profil',
        body: 'W tym miejscu sprawdzisz podsumowanie, zaktualizujesz dane profilu i ulubione siłownie.',
      },
    ],
  },
  {
    id: 'settings',
    version: 1,
    match: at('/athlete/settings'),
    steps: [
      {
        title: 'Ustawienia aplikacji',
        body: 'Dostosuj motyw, dźwięki przerw, powiadomienia, pobierz dane offline oraz połącz konto ze Stravą i Spotify.',
      },
    ],
  },
  {
    id: 'workouts',
    version: 1,
    match: at('/athlete/workouts'),
    steps: [
      {
        target: 'workouts-actions',
        title: 'Twoje szablony',
        body: 'Szablon to trening zapisany na później: ćwiczenia, serie i przerwy. Stwórz własny albo zacznij pustą sesję.',
      },
      {
        target: 'workouts-filters',
        title: 'Szukaj i filtruj',
        body: 'Znajdź szablon po nazwie albo zawęź listę do partii mięśni, które chcesz dziś trenować.',
      },
    ],
  },
  {
    id: 'exercises',
    version: 1,
    match: at('/athlete/exercises'),
    steps: [
      {
        target: 'exercises-filters',
        title: 'Baza ćwiczeń',
        body: 'Szukaj po nazwie albo filtruj po partii mięśni. Dotknięcie ćwiczenia otwiera opis techniki.',
      },
      {
        target: 'exercises-tools',
        title: 'Widok i własne ćwiczenia',
        body: 'Zmień układ listy albo dodaj własne ćwiczenie, jeśli brakuje go w bazie.',
      },
    ],
  },
  {
    id: 'running',
    version: 1,
    match: at('/athlete/running'),
    steps: [
      {
        target: 'running-start',
        title: 'Start biegu',
        body: 'Duży przycisk uruchamia zapis trasy. Mniejsze obok pozwalają dopisać bieg ręcznie i pobrać aktywności ze Stravy, jeśli ją połączysz.',
      },
      {
        target: 'running-week',
        title: 'Twój tydzień biegowy',
        body: 'Kilometry dzień po dniu, żeby jednym spojrzeniem ocenić obciążenie.',
      },
      {
        target: 'running-history',
        title: 'Historia biegów',
        body: 'Wszystkie biegi w jednym miejscu. Dotknij dowolnego, aby zobaczyć jego szczegóły.',
      },
    ],
  },
  {
    id: 'habits',
    version: 1,
    match: at('/athlete/habits'),
    steps: [
      {
        target: 'habits-add',
        title: 'Nowy nawyk',
        body: 'Nadaj nazwę, wybierz ikonę i częstotliwość: codziennie, co kilka dni albo w wybrane dni tygodnia.',
      },
      {
        target: 'habits-stats',
        title: 'Wykonanie tygodnia',
        body: 'Jaki procent zaplanowanych nawyków udało się odhaczyć w tym tygodniu.',
      },
      {
        target: 'habits-view',
        title: 'Tydzień lub miesiąc',
        body: 'Przełącz widok i odhaczaj nawyki dotknięciem. Dzisiejsze znajdziesz też na ekranie Dziś.',
      },
    ],
  },
  {
    id: 'progress',
    version: 1,
    match: at('/athlete/progress'),
    steps: [
      {
        target: 'progress-period',
        title: 'Okres',
        body: 'Wybierz przedział czasu. Wszystkie liczby i wykresy poniżej przeliczą się dla niego.',
      },
      {
        target: 'progress-summary',
        title: 'Podsumowanie',
        body: 'Najważniejsze liczby z wybranego okresu, zebrane z Twoich treningów i pomiarów.',
      },
      {
        target: 'progress-charts',
        title: 'Cztery wykresy',
        body: 'Objętość treningów, siła w wybranym ćwiczeniu (szacowany 1RM), waga i obwody. Dotknij punktu na wykresie, aby zobaczyć wartość.',
      },
    ],
  },
  {
    id: 'calendar',
    version: 1,
    match: at('/athlete/calendar'),
    steps: [
      {
        target: 'calendar-strip',
        title: 'Wybierz dzień',
        body: 'Przesuwaj pasek w bok i dotknij dnia. Kropki pod datą oznaczają, że coś jest na ten dzień wpisane.',
      },
      {
        target: 'calendar-agenda',
        title: 'Plan dnia',
        body: 'Treningi i sesje z trenerem na wybrany dzień. Dotknij wpisu, aby zobaczyć szczegóły.',
      },
    ],
  },
  {
    id: 'goals',
    version: 1,
    match: at('/athlete/goals'),
    steps: [
      {
        target: 'goals-hero',
        title: 'Poziom i punkty',
        body: 'Twój poziom i punkty zdobywane za aktywność w aplikacji.',
      },
      {
        target: 'goals-list',
        title: 'Twoje cele',
        body: 'Ustaw cel z liczbą i jednostką, np. 100 kg w wyciskaniu. Postęp aktualizujesz dotknięciem karty.',
      },
      {
        target: 'goals-tracks',
        title: 'Osiągnięcia',
        body: 'Odznaki, które aplikacja przyznaje sama, gdy przekraczasz kolejne progi.',
      },
      {
        target: 'goals-trophies',
        title: 'Trofea',
        body: 'Miejsce na własne trofea, np. medale z zawodów. Dodajesz je ręcznie.',
      },
    ],
  },
  {
    id: 'measurements',
    version: 1,
    match: at('/athlete/measurements'),
    steps: [
      {
        target: 'measurements-hero',
        title: 'Waga i nowy pomiar',
        body: 'Aktualna waga i kierunek zmian. Stąd dodasz nowy pomiar: wagę, obwody i zdjęcia sylwetki.',
      },
      {
        target: 'measurements-tiles',
        title: 'Obwody',
        body: 'Dotknij kafelka, aby zobaczyć na wykresie, jak dany pomiar zmieniał się w czasie.',
      },
      {
        target: 'measurements-photos',
        title: 'Zdjęcia sylwetki',
        body: 'Porównaj dwa zdjęcia z różnych dni obok siebie i zobacz zmianę, której nie pokaże waga.',
      },
    ],
  },
  {
    id: 'history',
    version: 1,
    match: at('/athlete/history'),
    steps: [
      {
        target: 'history-list',
        title: 'Historia',
        body: 'Ukończone treningi i biegi w jednej osi czasu. Dotknij wpisu, aby zobaczyć szczegóły sesji.',
      },
    ],
  },
  {
    id: 'challenges',
    version: 1,
    match: at('/athlete/challenges'),
    steps: [
      {
        target: 'challenges-new',
        title: 'Wyzwij znajomego',
        body: 'Wybierz osobę, dystans i termin. Wygrywa ten, kto pierwszy przebiegnie dystans. Liczą się biegi z aplikacji i ze Stravy.',
      },
      {
        target: 'challenges-record',
        title: 'Twój bilans',
        body: 'Wygrane, remisy i porażki ze wszystkich zakończonych wyzwań.',
      },
    ],
  },
  {
    id: 'gamification',
    version: 1,
    match: at('/athlete/gamification'),
    steps: [
      {
        target: 'gamification-stats',
        title: 'Poziom i serie',
        body: 'Twój poziom, punkty i serie. Tu widać, jak regularnie trenujesz.',
      },
      {
        target: 'gamification-tabs',
        title: 'Nagrody, osiągnięcia, ranking',
        body: 'Przeglądaj dostępne nagrody, zdobyte odznaki i swoje miejsce w rankingu.',
      },
    ],
  },
];

export function findTourForRoute(pathname: string, search: string): TourDef | undefined {
  const params = new URLSearchParams(search);
  return TOURS.find(tour => tour.match(pathname, params));
}
