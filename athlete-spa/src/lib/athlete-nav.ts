import {
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Compass,
  Images,
  Dumbbell,
  Flag,
  Footprints,
  History,
  IdCard,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Map,
  MessageSquare,
  Newspaper,
  NotebookPen,
  Play,
  Ruler,
  SlidersHorizontal,
  SquarePen,
  SquarePlus,
  TrendingUp,
  Trophy,
  User,
  UserCheck,
  Users,
  UtensilsCrossed,
  Users2,
} from '@/components/animated-icons';
import type { AnimatedIcon } from '@/components/animated-icons';
import type { UserProfile } from '@/lib/types';

export type NavRole = UserProfile['role'];

export interface NavLeaf {
  href: string;
  label: string;
  icon: AnimatedIcon;
  /** One-line hint shown in search results and tooltips. */
  description?: string;
  /** Extra words the menu search should match (synonyms, features on the screen). */
  keywords?: string[];
  /** Roles that get this entry in their menu; everyone when omitted. */
  roles?: NavRole[];
  /** Domain colour when it differs from the group's (running in Trening is blue). */
  color?: string;
}

export interface NavGroup {
  label: string;
  icon: AnimatedIcon;
  /** CSS colour that identifies the group everywhere in the menu. */
  color: string;
  items: NavLeaf[];
  /** Roles that get this group in their menu; everyone when omitted. */
  roles?: NavRole[];
}

export type NavEntry = NavLeaf | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry;
}

/**
 * Single source of truth for the athlete section's navigation, shared by the
 * "Menu" tab and the header's screen title.
 *
 * Colours are the domain tokens, so a destination reads the same here as on
 * the screen behind it: training is ember, running blue, food amber, habits
 * green, the coach violet. A leaf's own `color` wins over its group's.
 */
export const athleteNavItems: NavEntry[] = [
  { href: '/athlete/dashboard', icon: LayoutDashboard, label: 'Dziś', description: 'Twój dzień w skrócie' },
  {
    label: 'Dla trenera',
    icon: Award,
    color: 'hsl(var(--primary))',
    roles: ['trainer'],
    items: [
      { href: '/athlete/trainer-panel', label: 'Panel trenera', icon: LayoutGrid, description: 'Podopieczni, plany i sesje', keywords: ['trener', 'podopieczni', 'klienci', 'zarządzanie', 'coach'] },
      { href: '/athlete/knowledge-zone/manage', label: 'Zarządzaj artykułami', icon: SquarePen, description: 'Baza wiedzy i publikacje', keywords: ['artykuły', 'porady', 'wiedza', 'publikacje', 'edycja', 'trener'] },
    ],
  },
  {
    label: 'Trening',
    icon: Dumbbell,
    color: 'hsl(var(--primary))',
    items: [
      { href: '/athlete/log', label: 'Trenuj teraz', icon: Play, description: 'Rozpocznij sesję treningową', keywords: ['start', 'sesja', 'siłownia', 'trening'] },
      { href: '/athlete/workouts', label: 'Szablony', icon: ClipboardList, description: 'Twoje zapisane treningi', keywords: ['treningi', 'workout', 'rutyna'] },
      { href: '/athlete/workouts/create', label: 'Nowy trening', icon: SquarePlus, description: 'Stwórz własny szablon', keywords: ['kreator', 'nowy', 'stwórz', 'szablon', 'plan'] },
      { href: '/athlete/exercises', label: 'Ćwiczenia', icon: Dumbbell, description: 'Baza z instrukcjami', keywords: ['atlas', 'technika', 'mięśnie', 'baza'] },
      { href: '/athlete/running', label: 'Bieganie', icon: Footprints, color: 'hsl(var(--run))', description: 'Biegi z GPS i Stravy', keywords: ['bieg', 'strava', 'gps', 'trasa', 'wyzwania'] },
      { href: '/athlete/history', label: 'Historia', icon: History, description: 'Ukończone treningi', keywords: ['dziennik', 'log', 'poprzednie'] },
    ],
  },
  {
    label: 'Na co dzień',
    icon: CalendarDays,
    color: 'hsl(var(--volt))',
    items: [
      { href: '/athlete/nutrition', label: 'Kalorie', icon: NotebookPen, color: 'hsl(var(--food))', description: 'Dziennik posiłków i makro', keywords: ['jedzenie', 'posiłki', 'makro', 'kcal', 'białko', 'dieta'] },
      { href: '/athlete/habits', label: 'Nawyki', icon: CheckSquare, description: 'Codzienne nawyki i serie', keywords: ['rutyna', 'woda', 'sen', 'codziennie'] },
      { href: '/athlete/calendar', label: 'Kalendarz', icon: CalendarDays, description: 'Zaplanowane sesje', keywords: ['dziennik', 'terminarz', 'harmonogram', 'plan', 'treningi'] },
      { href: '/athlete/diet', label: 'Plan diety', icon: UtensilsCrossed, color: 'hsl(var(--food))', description: 'Jadłospis od trenera', keywords: ['jadłospis', 'przepisy', 'menu', 'dieta'] },
    ],
  },
  {
    label: 'Postępy',
    icon: TrendingUp,
    color: 'hsl(var(--primary))',
    items: [
      { href: '/athlete/progress', label: 'Wykresy', icon: BarChart3, color: 'hsl(var(--run))', description: 'Objętość, 1RM, waga', keywords: ['postępy', 'progres', 'siła', 'objętość', 'rekordy', '1rm'] },
      { href: '/athlete/measurements', label: 'Pomiary', icon: Ruler, color: 'hsl(var(--volt))', description: 'Waga, obwody i zdjęcia', keywords: ['waga', 'obwody', 'sylwetka', 'zdjęcia'] },
      { href: '/athlete/goals', label: 'Cele i trofea', icon: Trophy, color: 'hsl(var(--food))', description: 'Cele i osiągnięcia', keywords: ['osiągnięcia', 'odznaki', 'nagrody', 'cele'] },
      { href: '/athlete/gamification', label: 'Grywalizacja i nagrody', icon: Award, color: 'hsl(var(--food))', description: 'Poziomy, FitCoiny i sklep', keywords: ['grywalizacja', 'gamification', 'fitcoins', 'nagrody', 'poziom', 'xp', 'ranking'] },
    ],
  },
  {
    label: 'Twój trener',
    icon: UserCheck,
    color: 'hsl(var(--social))',
    items: [
      { href: '/athlete/workout-plans', label: 'Mój program', icon: Layers, description: 'Program od trenera', keywords: ['plan', 'trener', 'etapy'] },
      { href: '/athlete/chat', label: 'Czat', icon: MessageSquare, description: 'Rozmowy z trenerem', keywords: ['wiadomości', 'trener', 'rozmowa'] },
      { href: '/athlete/check-in', label: 'Check-in', icon: ClipboardCheck, description: 'Raport dla trenera', keywords: ['raport', 'ankieta', 'trener', 'tydzień'] },
      { href: '/athlete/trainers', label: 'Znajdź trenera', icon: Users, description: 'Trenerzy osobiści', keywords: ['trenerzy', 'coach', 'współpraca', 'personalny'] },
    ],
  },
  {
    label: 'Społeczność',
    icon: Users2,
    color: 'hsl(var(--social))',
    items: [
      { href: '/athlete/social', label: 'Aktywność znajomych', icon: Newspaper, description: 'Treningi, biegi i statusy', keywords: ['social', 'feed', 'znajomi', 'tablica'] },
      { href: '/athlete/social?tab=discover', label: 'Odkrywaj', icon: Images, description: 'Zdjęcia społeczności', keywords: ['posty', 'zdjęcia', 'tablica', 'social'] },
      { href: '/athlete/social?tab=people', label: 'Ludzie', icon: UserCheck, description: 'Znajomi, zaproszenia, okolica', keywords: ['przyjaciele', 'zaproszenia', 'blisko', 'okolica', 'social'] },
      { href: '/athlete/challenges', label: 'Wyzwania', icon: Flag, color: 'hsl(var(--run))', description: 'Biegowe wyścigi ze znajomymi', keywords: ['wyzwanie', 'wyzwania', 'rywalizacja', 'wyścig', 'bieg', 'znajomi', 'pojedynek', 'challenge'] },
    ],
  },
  {
    // Not "Odkrywaj": that is already a destination in Społeczność.
    label: 'Wiedza i miejsca',
    icon: Compass,
    color: 'hsl(var(--muted-foreground))',
    items: [
      { href: '/athlete/knowledge-zone', label: 'Strefa wiedzy', icon: BookOpen, color: 'hsl(var(--run))', description: 'Artykuły i porady', keywords: ['artykuły', 'porady', 'blog', 'wiedza'] },
      { href: '/athlete/map', label: 'Mapa siłowni', icon: Map, color: 'hsl(var(--primary))', description: 'Siłownie w okolicy', keywords: ['siłownie', 'gym', 'mapa'] },
    ],
  },
  {
    // Profil is on the bottom bar under "Ty", while Ustawienia is displayed in
    // the menu and accessible from the profile header.
    label: 'Ustawienia',
    icon: SlidersHorizontal,
    color: 'hsl(var(--primary))',
    items: [
      { href: '/athlete/you', label: 'Profil', icon: IdCard, color: 'hsl(var(--primary))', description: 'Podsumowanie, poziom, dane profilu', keywords: ['podsumowanie', 'wizytówka', 'statystyki', 'kilometry', 'tony', 'czołgi', 'równik', 'konto', 'awatar', 'zdjęcie', 'imię', 'email', 'siłownie', 'poziom', 'xp'] },
      { href: '/athlete/settings', label: 'Ustawienia', icon: SlidersHorizontal, color: 'hsl(var(--primary))', description: 'Motyw, powiadomienia, integracje', keywords: ['motyw', 'ciemny', 'jasny', 'powiadomienia', 'push', 'strava', 'spotify', 'integracje', 'wibracje', 'przerwa', 'gps', 'lokalizacja', 'aparat', 'offline', 'wyloguj'] },
    ],
  },
];

/** Every destination flattened, for href lookups. */
export const athleteNavLeaves: NavLeaf[] = athleteNavItems.flatMap(entry =>
  isNavGroup(entry) ? entry.items : [entry]
);

/** The menu one role sees: entries restricted to other roles are left out. */
export function navItemsForRole(role: NavRole | undefined): NavEntry[] {
  return athleteNavItems.filter(entry => !entry.roles || (role !== undefined && entry.roles.includes(role)));
}

/** Destinations `role` can reach, flattened. */
export function navLeavesForRole(role: NavRole | undefined): NavLeaf[] {
  return navItemsForRole(role).flatMap(entry => (isNavGroup(entry) ? entry.items : [entry]));
}

export function findNavLeaf(pathname: string): NavLeaf | undefined {
  return athleteNavLeaves.find(leaf => leaf.href === pathname);
}

/**
 * Whether a nav link points at the current screen. Some links open a tab of a
 * screen via a query param (`/athlete/social?tab=people`); those match on the
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

/** The colour a destination is drawn in: its own, else its group's, else neutral. */
export function navLeafColor(leaf: NavLeaf): string {
  return leaf.color ?? findNavGroup(leaf.href)?.color ?? 'hsl(var(--muted-foreground))';
}

/** Lower-cased, diacritics stripped — "ćwiczenia" matches "cwiczenia". */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').toLowerCase();
}

/**
 * Destinations matching every word of `query` against label, description,
 * keywords and group name. Label matches rank first, then keyword matches.
 */
export function searchNavLeaves(query: string, role: NavRole | undefined): NavLeaf[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  return navLeavesForRole(role)
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
 * shows their big title rather than a way back — there is nothing above them.
 */
export const ROOT_TITLES: Record<string, string> = {
  '/athlete/dashboard': 'leniwakluska',
  '/athlete/log': 'Trening',
  '/athlete/diet': 'Dieta',
  '/athlete/social': 'Ekipa',
  '/athlete/menu': 'Menu',
  '/athlete/you': 'Ty',
};

export const ROOT_PATHS = Object.keys(ROOT_TITLES);

export function isRootPath(pathname: string): boolean {
  return ROOT_PATHS.includes(pathname);
}

/** Screens where the header and bottom nav stay pinned while scrolling (infinite exercise list). */
export function keepsChromeVisible(pathname: string): boolean {
  return /^\/athlete\/exercises/.test(pathname);
}

/** Titles for screens that aren't nav destinations (details, editors). */
const EXTRA_TITLES: { match: RegExp; title: string }[] = [
  { match: /^\/athlete\/trainers\/[^/]+$/, title: 'Trener' },
  { match: /^\/athlete\/challenges\/[^/]+$/, title: 'Wyzwanie' },
  { match: /^\/athlete\/templates$/, title: 'Szablony' },
  { match: /^\/athlete\/gamification$/, title: 'Osiągnięcia' },
  { match: /^\/athlete\/history\/[^/]+$/, title: 'Trening' },
  { match: /^\/athlete\/workouts\/create$/, title: 'Nowy trening' },
  { match: /^\/athlete\/workouts\/[^/]+\/edit$/, title: 'Edycja treningu' },
  { match: /^\/athlete\/workouts\/[^/]+$/, title: 'Trening' },
  { match: /^\/athlete\/running\/record$/, title: 'Bieg' },
  { match: /^\/athlete\/running\/.+$/, title: 'Bieg' },
  { match: /^\/athlete\/exercise\/[^/]+$/, title: 'Ćwiczenie' },
  { match: /^\/athlete\/knowledge-zone\/manage$/, title: 'Zarządzaj artykułami' },
  { match: /^\/athlete\/knowledge-zone\/[^/]+$/, title: 'Artykuł' },
];

/** Label for the current screen, or undefined when there is nothing sensible to show. */
export function getScreenTitle(pathname: string, search = '', userName?: string): string | undefined {
  // Tab links (`/athlete/social?tab=people`) title their own tab, not the screen's default one.
  if (search) {
    const activeLeafWithQuery = athleteNavLeaves.find(
      leaf => leaf.href.includes('?') && isNavLeafActive(leaf.href, pathname, search)
    );
    if (activeLeafWithQuery) return activeLeafWithQuery.label;
  }
  if (pathname === '/athlete/you' && userName?.trim()) return userName.trim();
  if (ROOT_TITLES[pathname]) return ROOT_TITLES[pathname];
  const activeLeaf = athleteNavLeaves.find(leaf => isNavLeafActive(leaf.href, pathname, search));
  return activeLeaf?.label ?? findNavLeaf(pathname)?.label ?? EXTRA_TITLES.find(e => e.match.test(pathname))?.title;
}
