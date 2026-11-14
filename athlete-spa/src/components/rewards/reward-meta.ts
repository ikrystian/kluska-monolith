import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  CheckCheck,
  Crown,
  Dumbbell,
  Flame,
  Footprints,
  Layers,
  MapPin,
  Medal,
  Repeat,
  Route,
  Ruler,
  Sun,
  Sunrise,
  Target,
  Timer,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { GoalMetric, Rarity } from '@/hooks/useRewards';

/** Nazwy ikon przychodzą z katalogu na serwerze; nieznana → puchar. */
const ICONS: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  zap: Zap,
  'calendar-check': CalendarCheck,
  flame: Flame,
  medal: Medal,
  target: Target,
  footprints: Footprints,
  'check-check': CheckCheck,
  ruler: Ruler,
  sunrise: Sunrise,
  sun: Sun,
  'map-pin': MapPin,
  crown: Crown,
  'calendar-days': CalendarDays,
  'calendar-range': CalendarRange,
  layers: Layers,
  repeat: Repeat,
  route: Route,
  timer: Timer,
};

export const rewardIcon = (name?: string): LucideIcon => (name && ICONS[name]) || Trophy;

export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'Zwykłe', color: 'hsl(var(--muted-foreground))' },
  rare: { label: 'Rzadkie', color: 'hsl(var(--run))' },
  epic: { label: 'Epickie', color: 'hsl(var(--social))' },
  legendary: { label: 'Legendarne', color: 'hsl(var(--food))' },
};

export const rarityOf = (rarity: string) => RARITY[(rarity as Rarity) in RARITY ? (rarity as Rarity) : 'common'];

export const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export interface GoalTemplate {
  metric: GoalMetric;
  label: string;
  /** Co dokładnie będzie liczone — pokazywane w formularzu. */
  hint: string;
  icon: LucideIcon;
  color: string;
  /** Jednostka celu; null = użytkownik wpisuje własną. */
  unit: string | null;
  /** Tytuł podpowiadany z wartości celu. */
  title: (target: string, exerciseName?: string) => string;
  targetLabel: string;
  placeholder: string;
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    metric: 'total_volume',
    label: 'Tonaż',
    hint: 'Liczy się samo: ciężar × powtórzenia z każdej odhaczonej serii, od dziś.',
    icon: Dumbbell,
    color: 'hsl(var(--primary))',
    unit: 't',
    title: target => `Podnieś łącznie ${target} t`,
    targetLabel: 'Ile ton chcesz podnieść?',
    placeholder: '50',
  },
  {
    metric: 'workout_count',
    label: 'Treningi',
    hint: 'Liczy się samo: każdy ukończony trening od dziś.',
    icon: CalendarCheck,
    color: 'hsl(var(--primary))',
    unit: 'treningów',
    title: target => `Zrób ${target} treningów`,
    targetLabel: 'Ile treningów chcesz zrobić?',
    placeholder: '20',
  },
  {
    metric: 'exercise_max_weight',
    label: 'Rekord w ćwiczeniu',
    hint: 'Liczy się samo: najcięższa odhaczona seria w wybranym ćwiczeniu.',
    icon: Medal,
    color: 'hsl(var(--food))',
    unit: 'kg',
    title: (target, exercise) => `${exercise ?? 'Ćwiczenie'}: ${target} kg`,
    targetLabel: 'Jaki ciężar chcesz osiągnąć?',
    placeholder: '100',
  },
  {
    metric: 'body_weight',
    label: 'Waga ciała',
    hint: 'Liczy się samo: z Twojego ostatniego pomiaru wagi.',
    icon: Ruler,
    color: 'hsl(var(--social))',
    unit: 'kg',
    title: target => `Waga ${target} kg`,
    targetLabel: 'Do jakiej wagi dążysz?',
    placeholder: '80',
  },
  {
    metric: 'run_distance',
    label: 'Bieganie',
    hint: 'Liczy się samo: kilometry z zapisanych biegów i ze Stravy, od dziś.',
    icon: Footprints,
    color: 'hsl(var(--run))',
    unit: 'km',
    title: target => `Przebiegnij ${target} km`,
    targetLabel: 'Ile kilometrów chcesz przebiec?',
    placeholder: '100',
  },
  {
    metric: 'streak_days',
    label: 'Seria dni',
    hint: 'Liczy się samo: kolejne dni z treningiem lub biegiem.',
    icon: Flame,
    color: 'hsl(var(--primary))',
    unit: 'dni',
    title: target => `${target} dni aktywności z rzędu`,
    targetLabel: 'Ile dni z rzędu?',
    placeholder: '14',
  },
  {
    metric: 'habit_days',
    label: 'Nawyki',
    hint: 'Liczy się samo: każdy odhaczony nawyk od dziś.',
    icon: CheckCheck,
    color: 'hsl(var(--volt))',
    unit: 'odhaczeń',
    title: target => `Odhacz nawyki ${target} razy`,
    targetLabel: 'Ile odhaczeń?',
    placeholder: '30',
  },
  {
    metric: 'manual',
    label: 'Własny',
    hint: 'Postęp wpisujesz samodzielnie — dla wszystkiego, czego aplikacja nie mierzy.',
    icon: Target,
    color: 'hsl(var(--muted-foreground))',
    unit: null,
    title: () => '',
    targetLabel: 'Wartość docelowa',
    placeholder: '100',
  },
];

export const templateFor = (metric: GoalMetric): GoalTemplate =>
  GOAL_TEMPLATES.find(template => template.metric === metric) ?? GOAL_TEMPLATES[GOAL_TEMPLATES.length - 1];

export const formatNumber = (value: number, digits = 1) =>
  value.toLocaleString('pl-PL', { maximumFractionDigits: digits });

/** Kilogramy jako tony, gdy robi się ich dużo: 850 kg, 12,4 t. */
export function formatVolume(kg: number): { value: string; unit: string } {
  if (kg >= 1000) return { value: formatNumber(kg / 1000, kg >= 100_000 ? 0 : 1), unit: 't' };
  return { value: formatNumber(kg, 0), unit: 'kg' };
}
