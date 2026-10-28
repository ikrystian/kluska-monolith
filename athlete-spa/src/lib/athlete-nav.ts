import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Compass,
  Dumbbell,
  Footprints,
  History,
  IdCard,
  Layers,
  LayoutDashboard,
  Map,
  MapPin,
  MessageSquare,
  Newspaper,
  NotebookPen,
  Play,
  Ruler,
  TrendingUp,
  Trophy,
  UserCheck,
  UtensilsCrossed,
  Users2,
  type LucideIcon,
} from 'lucide-react';

export interface NavLeaf {
  href: string;
  label: string;
  icon: LucideIcon;
  /** One-line hint shown in search results and tooltips. */
  description?: string;
  /** Extra words the menu search should match (synonyms, features on the screen). */
  keywords?: string[];
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  /** CSS colour that identifies the group everywhere in the menu. */
  color: string;
  items: NavLeaf[];
}

export type NavEntry = NavLeaf | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry;
}

/**
 * Single source of truth for the athlete section's navigation, shared by the
 * desktop sidebar, the mobile "more" sheet and the header's screen title.
 *
 * Group colours come from the CVD-validated chart tokens, in an order that
 * keeps the two warm hues (ember, amber) apart.
 */
export const athleteNavItems: NavEntry[] = [
  { href: '/athlete/dashboard', icon: LayoutDashboard, label: 'Panel', description: 'Start — Twój dzień w skrócie' },
  {
    label: 'Trening',
    icon: Dumbbell,
    color: 'hsl(var(--chart-1))',
    items: [
      { href: '/athlete/log', label: 'Trenuj teraz', icon: Play, description: 'Rozpocznij sesję treningową', keywords: ['start', 'sesja', 'siłownia'] },
      { href: '/athlete/workout-plans', label: 'Mój program', icon: Layers, description: 'Program od trenera', keywords: ['plan', 'trener', 'etapy'] },
      { href: '/athlete/workouts', label: 'Szablony', icon: ClipboardList, description: 'Twoje zapisane treningi', keywords: ['treningi', 'workout', 'rutyna'] },
      { href: '/athlete/exercises', label: 'Ćwiczenia', icon: Dumbbell, description: 'Baza ćwiczeń z instrukcjami', keywords: ['atlas', 'technika', 'mięśnie'] },
      { href: '/athlete/running', label: 'Bieganie', icon: Footprints, description: 'Biegi z GPS i Stravy', keywords: ['bieg', 'strava', 'gps', 'trasa', 'wyzwania'] },
      { href: '/athlete/history', label: 'Historia', icon: History, description: 'Ukończone treningi', keywords: ['dziennik', 'log', 'poprzednie'] },
    ],
  },
  {
    label: 'Postępy',
    icon: TrendingUp,
    color: 'hsl(var(--chart-3))',
    items: [
      { href: '/athlete/summary', label: 'Podsumowanie', icon: IdCard, description: 'Kilometry, tony, treningi', keywords: ['wizytówka', 'statystyki', 'profil', 'czołgi', 'równik'] },
      { href: '/athlete/progress', label: 'Wykresy', icon: BarChart3, description: 'Objętość, 1RM i waga w czasie', keywords: ['postępy', 'progres', 'siła', 'objętość'] },
      { href: '/athlete/measurements', label: 'Pomiary', icon: Ruler, description: 'Waga, obwody i zdjęcia', keywords: ['waga', 'obwody', 'sylwetka', 'zdjęcia'] },
      { href: '/athlete/goals', label: 'Cele i trofea', icon: Trophy, description: 'Cele i zdobyte osiągnięcia', keywords: ['osiągnięcia', 'odznaki', 'nagrody'] },
    ],
  },
  {
    label: 'Plan',
    icon: CalendarDays,
    color: 'hsl(var(--chart-2))',
    items: [
      { href: '/athlete/calendar', label: 'Kalendarz', icon: CalendarDays, description: 'Zaplanowane treningi i sesje', keywords: ['dziennik', 'terminarz', 'harmonogram'] },
      { href: '/athlete/habits', label: 'Nawyki', icon: CheckSquare, description: 'Codzienne nawyki i serie', keywords: ['rutyna', 'woda', 'sen', 'codziennie'] },
      { href: '/athlete/check-in', label: 'Check-in', icon: ClipboardCheck, description: 'Raport dla trenera', keywords: ['raport', 'ankieta', 'trener', 'tydzień'] },
    ],
  },
  {
    label: 'Dieta',
    icon: UtensilsCrossed,
    color: 'hsl(var(--chart-5))',
    items: [
      { href: '/athlete/nutrition', label: 'Kalorie', icon: NotebookPen, description: 'Dziennik posiłków i makro', keywords: ['jedzenie', 'posiłki', 'makro', 'kcal', 'białko'] },
      { href: '/athlete/diet', label: 'Plan diety', icon: UtensilsCrossed, description: 'Jadłospis od trenera', keywords: ['jadłospis', 'przepisy', 'menu'] },
    ],
  },
  {
    label: 'Społeczność',
    icon: Users2,
    color: 'hsl(var(--chart-4))',
    items: [
      { href: '/athlete/chat', label: 'Czat', icon: MessageSquare, description: 'Rozmowy z trenerem', keywords: ['wiadomości', 'trener', 'rozmowa'] },
      { href: '/athlete/social', label: 'Tablica', icon: Newspaper, description: 'Posty i aktywność', keywords: ['social', 'posty', 'feed'] },
      { href: '/athlete/social?tab=friends', label: 'Znajomi', icon: UserCheck, description: 'Znajomi i zaproszenia', keywords: ['przyjaciele', 'zaproszenia', 'social'] },
      { href: '/athlete/social?tab=nearby', label: 'W okolicy', icon: MapPin, description: 'Sportowcy w pobliżu', keywords: ['blisko', 'okolica', 'social'] },
    ],
  },
  {
    label: 'Odkrywaj',
    icon: Compass,
    color: 'hsl(var(--muted-foreground))',
    items: [
      { href: '/athlete/knowledge-zone', label: 'Strefa wiedzy', icon: BookOpen, description: 'Artykuły i porady', keywords: ['artykuły', 'porady', 'blog', 'wiedza'] },
      { href: '/athlete/map', label: 'Mapa siłowni', icon: Map, description: 'Siłownie w okolicy', keywords: ['siłownie', 'gym', 'mapa'] },
    ],
  },
];

/** Every destination flattened, for href lookups. */
export const athleteNavLeaves: NavLeaf[] = athleteNavItems.flatMap(entry =>
  isNavGroup(entry) ? entry.items : [entry]
);

export function findNavLeaf(pathname: string): NavLeaf | undefined {
  return athleteNavLeaves.find(leaf => leaf.href === pathname);
}

/**
 * Whether a nav link points at the current screen. Some links open a tab of a
 * screen via a query param (`/athlete/social?tab=friends`); those match on the
 * param, and the plain link to the same screen stays active only while none
 * of its tab links does.
 */
export function isNavLeafActive(href: string, pathname: string, search: string): boolean {
  const [path, query] = href.split('?');
  if (path !== pathname) return false;

  const current = new URLSearchParams(search);
  if (query) {
    return [...new URLSearchParams(query)].every(([key, value]) => current.get(key) === value);
  }

  return !athleteNavLeaves.some(
    leaf => leaf.href.startsWith(`${path}?`) && isNavLeafActive(leaf.href, pathname, search)
  );
}

/** The group a destination belongs to, for its colour and heading. */
export function findNavGroup(href: string): NavGroup | undefined {
  return athleteNavItems.filter(isNavGroup).find(group => group.items.some(item => item.href === href));
}

/** Lower-cased, diacritics stripped — "ćwiczenia" matches "cwiczenia". */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').toLowerCase();
}

/**
 * Destinations matching every word of `query` against label, description,
 * keywords and group name. Label matches rank first, then keyword matches.
 */
export function searchNavLeaves(query: string): NavLeaf[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  return athleteNavLeaves
    .map(leaf => {
      const label = normalize(leaf.label);
      const haystack = normalize(
        [leaf.label, leaf.description ?? '', ...(leaf.keywords ?? []), findNavGroup(leaf.href)?.label ?? ''].join(' ')
      );
      if (!words.every(word => haystack.includes(word))) return null;
      const keywords = (leaf.keywords ?? []).map(normalize);
      const score =
        words.filter(word => label.includes(word)).length * 2 +
        (label.startsWith(words[0]) ? 2 : 0) +
        words.filter(word => keywords.some(keyword => keyword.startsWith(word))).length;
      return { leaf, score };
    })
    .filter((hit): hit is { leaf: NavLeaf; score: number } => hit !== null)
    .sort((a, b) => b.score - a.score)
    .map(hit => hit.leaf);
}

/**
 * Screens the bottom bar reaches directly. They anchor the app, so the header
 * greets rather than offering a way back — there is nothing above them.
 */
export const ROOT_PATHS = ['/athlete/dashboard', '/athlete/calendar', '/athlete/log', '/athlete/chat'];

export function isRootPath(pathname: string): boolean {
  return ROOT_PATHS.includes(pathname);
}

/** Titles for screens that aren't nav destinations (details, editors, profile). */
const EXTRA_TITLES: { match: RegExp; title: string }[] = [
  { match: /^\/athlete\/profile$/, title: 'Profil' },
  { match: /^\/athlete\/templates$/, title: 'Szablony' },
  { match: /^\/athlete\/gamification$/, title: 'Osiągnięcia' },
  { match: /^\/athlete\/history\/[^/]+$/, title: 'Szczegóły treningu' },
  { match: /^\/athlete\/workouts\/create$/, title: 'Nowy trening' },
  { match: /^\/athlete\/workouts\/[^/]+\/edit$/, title: 'Edycja treningu' },
  { match: /^\/athlete\/workouts\/[^/]+$/, title: 'Trening' },
  { match: /^\/athlete\/knowledge-zone\/manage$/, title: 'Zarządzaj artykułami' },
  { match: /^\/athlete\/knowledge-zone\/[^/]+$/, title: 'Artykuł' },
];

/** Label for the current screen, or undefined when there is nothing sensible to show. */
export function getScreenTitle(pathname: string, search = ''): string | undefined {
  // Tab links (`/athlete/social?tab=friends`) title their own tab, not the screen's default one.
  const activeLeaf = athleteNavLeaves.find(leaf => isNavLeafActive(leaf.href, pathname, search));
  return activeLeaf?.label ?? findNavLeaf(pathname)?.label ?? EXTRA_TITLES.find(e => e.match.test(pathname))?.title;
}
