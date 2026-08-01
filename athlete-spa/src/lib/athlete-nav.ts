import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Dumbbell,
  Footprints,
  History,
  Layers,
  LayoutDashboard,
  Map,
  MessageSquare,
  NotebookPen,
  Play,
  Ruler,
  TrendingUp,
  Trophy,
  UtensilsCrossed,
  Users2,
  type LucideIcon,
} from 'lucide-react';

export interface NavLeaf {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavLeaf[];
}

export type NavEntry = NavLeaf | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry;
}

/**
 * Single source of truth for the athlete section's navigation, shared by the
 * desktop sidebar, the mobile "more" sheet and the header's screen title.
 */
export const athleteNavItems: NavEntry[] = [
  { href: '/athlete/dashboard', icon: LayoutDashboard, label: 'Panel' },
  {
    label: 'Trening',
    icon: Dumbbell,
    items: [
      { href: '/athlete/log', label: 'Trenuj Teraz', icon: Play },
      { href: '/athlete/workouts', label: 'Szablony', icon: ClipboardList },
      { href: '/athlete/workout-plans', label: 'Mój Program', icon: Layers },
      { href: '/athlete/exercises', label: 'Ćwiczenia', icon: Dumbbell },
      { href: '/athlete/running', label: 'Bieganie', icon: Footprints },
      { href: '/athlete/history', label: 'Historia', icon: History },
    ],
  },
  {
    label: 'Postępy',
    icon: TrendingUp,
    items: [
      { href: '/athlete/progress', label: 'Postępy', icon: TrendingUp },
      { href: '/athlete/measurements', label: 'Pomiary', icon: Ruler },
      { href: '/athlete/goals', label: 'Cele i Trofea', icon: Trophy },
      { href: '/athlete/habits', label: 'Nawyki', icon: CheckSquare },
      { href: '/athlete/calendar', label: 'Kalendarz', icon: CalendarDays },
    ],
  },
  {
    label: 'Dieta',
    icon: UtensilsCrossed,
    items: [
      { href: '/athlete/diet', label: 'Plan Diety', icon: UtensilsCrossed },
      { href: '/athlete/nutrition', label: 'Kalorie', icon: NotebookPen },
    ],
  },
  {
    label: 'Społeczność',
    icon: Users2,
    items: [
      { href: '/athlete/chat', label: 'Czat', icon: MessageSquare },
      { href: '/athlete/social', label: 'Social', icon: Users2 },
    ],
  },
  { href: '/athlete/check-in', icon: ClipboardCheck, label: 'Check-in' },
  { href: '/athlete/knowledge-zone', icon: BookOpen, label: 'Strefa Wiedzy' },
  { href: '/athlete/map', icon: Map, label: 'Mapa Siłowni' },
];

/** Every destination flattened, for href lookups. */
export const athleteNavLeaves: NavLeaf[] = athleteNavItems.flatMap(entry =>
  isNavGroup(entry) ? entry.items : [entry]
);

export function findNavLeaf(pathname: string): NavLeaf | undefined {
  return athleteNavLeaves.find(leaf => leaf.href === pathname);
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
export function getScreenTitle(pathname: string): string | undefined {
  return findNavLeaf(pathname)?.label ?? EXTRA_TITLES.find(e => e.match.test(pathname))?.title;
}
