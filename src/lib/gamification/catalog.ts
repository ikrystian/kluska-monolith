import type { AthleteStats, StatMetric } from './stats';

/**
 * Katalog osiągnięć żyje w kodzie: nie wymaga seedowania bazy, a nowe progi
 * działają od razu także dla dotychczasowej historii użytkownika.
 */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type CatalogMetric = StatMetric | 'level';

export interface TrackTier {
  threshold: number;
  name: string;
  rarity: Rarity;
}

export interface TrackDefinition {
  id: string;
  title: string;
  /** Krótki opis tego, za co ścieżka nagradza. */
  blurb: string;
  metric: CatalogMetric;
  /** Jednostka wyświetlana przy postępie. */
  unit: 't' | 'kg' | 'km' | 'dni' | '';
  /** Dzielnik wartości statystyki do jednostki wyświetlanej (np. kg → t). */
  scale: number;
  icon: string;
  tiers: TrackTier[];
}

export interface CatalogAchievement {
  key: string;
  trackId: string;
  metric: CatalogMetric;
  /** Próg w jednostce statystyki (np. kilogramy, nie tony). */
  threshold: number;
  name: string;
  description: string;
  rarity: Rarity;
  icon: string;
  xp: number;
}

export const RARITY_XP: Record<Rarity, number> = {
  common: 50,
  rare: 150,
  epic: 400,
  legendary: 1000,
};

const t = (threshold: number, name: string, rarity: Rarity): TrackTier => ({ threshold, name, rarity });

export const TRACKS: TrackDefinition[] = [
  {
    id: 'volume',
    title: 'Tonaż',
    blurb: 'Łącznie podniesione kilogramy',
    metric: 'totalVolumeKg',
    unit: 't',
    scale: 1000,
    icon: 'dumbbell',
    tiers: [
      t(1, 'Pierwsza tona', 'common'),
      t(10, 'Dziesięć ton', 'common'),
      t(50, 'Ciężarówka', 'rare'),
      t(100, 'Sto ton', 'rare'),
      t(250, 'Lokomotywa', 'epic'),
      t(500, 'Pół tysiąca ton', 'epic'),
      t(1000, 'Tysiąc ton', 'legendary'),
    ],
  },
  {
    id: 'session_volume',
    title: 'Mocny trening',
    blurb: 'Tonaż jednego treningu',
    metric: 'bestWorkoutVolumeKg',
    unit: 't',
    scale: 1000,
    icon: 'zap',
    tiers: [t(5, 'Pięć ton na raz', 'rare'), t(10, 'Dziesięć ton na raz', 'epic'), t(20, 'Dwadzieścia ton na raz', 'legendary')],
  },
  {
    id: 'workouts',
    title: 'Treningi',
    blurb: 'Ukończone treningi',
    metric: 'workoutCount',
    unit: '',
    scale: 1,
    icon: 'calendar-check',
    tiers: [
      t(1, 'Pierwszy trening', 'common'),
      t(10, 'Rozgrzany', 'common'),
      t(25, 'Stały bywalec', 'rare'),
      t(50, 'Pięćdziesiątka', 'rare'),
      t(100, 'Setka', 'epic'),
      t(250, 'Weteran', 'epic'),
      t(500, 'Żelazna legenda', 'legendary'),
    ],
  },
  {
    id: 'streak',
    title: 'Seria dni',
    blurb: 'Najdłuższa seria aktywnych dni z rzędu',
    metric: 'longestStreakDays',
    unit: 'dni',
    scale: 1,
    icon: 'flame',
    tiers: [
      t(3, 'Trzy dni z rzędu', 'common'),
      t(7, 'Pełny tydzień', 'rare'),
      t(14, 'Dwa tygodnie', 'rare'),
      t(30, 'Miesiąc bez przerwy', 'epic'),
      t(60, 'Dwa miesiące', 'epic'),
      t(100, 'Sto dni', 'legendary'),
    ],
  },
  {
    id: 'records',
    title: 'Rekordy życiowe',
    blurb: 'Pobite rekordy w ćwiczeniach',
    metric: 'prCount',
    unit: '',
    scale: 1,
    icon: 'medal',
    tiers: [
      t(1, 'Pierwszy rekord', 'common'),
      t(5, 'Pięć rekordów', 'common'),
      t(10, 'Łowca rekordów', 'rare'),
      t(25, 'Seryjny rekordzista', 'epic'),
      t(50, 'Pięćdziesiąt rekordów', 'legendary'),
    ],
  },
  {
    id: 'goals',
    title: 'Cele',
    blurb: 'Osiągnięte cele',
    metric: 'goalsCompleted',
    unit: '',
    scale: 1,
    icon: 'target',
    tiers: [
      t(1, 'Cel osiągnięty', 'common'),
      t(5, 'Pięć celów', 'rare'),
      t(10, 'Dziesięć celów', 'epic'),
      t(25, 'Zawsze u celu', 'legendary'),
    ],
  },
  {
    id: 'running',
    title: 'Bieganie',
    blurb: 'Przebiegnięte kilometry',
    metric: 'runKm',
    unit: 'km',
    scale: 1,
    icon: 'footprints',
    tiers: [
      t(10, 'Pierwsza dycha', 'common'),
      t(50, 'Pięćdziesiąt kilometrów', 'common'),
      t(100, 'Sto kilometrów', 'rare'),
      t(500, 'Pięćset kilometrów', 'epic'),
      t(1000, 'Tysiąc kilometrów', 'legendary'),
    ],
  },
  {
    id: 'habits',
    title: 'Nawyki',
    blurb: 'Odhaczone nawyki',
    metric: 'habitCompletions',
    unit: '',
    scale: 1,
    icon: 'check-check',
    tiers: [
      t(10, 'Dobry początek', 'common'),
      t(50, 'Nawyk wchodzi w krew', 'rare'),
      t(200, 'Dwieście odhaczeń', 'epic'),
      t(500, 'Człowiek rutyny', 'legendary'),
    ],
  },
  {
    id: 'measurements',
    title: 'Pomiary',
    blurb: 'Zapisane pomiary ciała',
    metric: 'measurementsCount',
    unit: '',
    scale: 1,
    icon: 'ruler',
    tiers: [t(1, 'Pierwszy pomiar', 'common'), t(10, 'Dziesięć pomiarów', 'rare'), t(50, 'Kronikarz formy', 'epic')],
  },
  {
    id: 'early',
    title: 'Ranny ptaszek',
    blurb: 'Treningi zakończone przed 7:00',
    metric: 'earlyWorkouts',
    unit: '',
    scale: 1,
    icon: 'sunrise',
    tiers: [t(1, 'Przed świtem', 'common'), t(10, 'Ranny ptaszek', 'rare'), t(50, 'Zawsze o świcie', 'epic')],
  },
  {
    id: 'weekend',
    title: 'Weekendowy wojownik',
    blurb: 'Treningi w sobotę i niedzielę',
    metric: 'weekendWorkouts',
    unit: '',
    scale: 1,
    icon: 'sun',
    tiers: [t(5, 'Aktywny weekend', 'common'), t(25, 'Weekendowy wojownik', 'rare'), t(100, 'Weekend należy do mnie', 'epic')],
  },
  {
    id: 'gyms',
    title: 'Odkrywca',
    blurb: 'Różne siłownie, w których trenowałeś',
    metric: 'distinctGyms',
    unit: '',
    scale: 1,
    icon: 'map-pin',
    tiers: [t(3, 'Trzy siłownie', 'rare'), t(10, 'Dziesięć siłowni', 'epic')],
  },
  {
    id: 'level',
    title: 'Poziom',
    blurb: 'Poziom konta',
    metric: 'level',
    unit: '',
    scale: 1,
    icon: 'crown',
    tiers: [
      t(5, 'Piąty poziom', 'common'),
      t(10, 'Dziesiąty poziom', 'rare'),
      t(15, 'Piętnasty poziom', 'epic'),
      t(20, 'Dwudziesty poziom', 'legendary'),
    ],
  },
];

function formatThreshold(track: TrackDefinition, value: number): string {
  const amount = value.toLocaleString('pl-PL');
  return track.unit ? `${amount} ${track.unit}` : amount;
}

export const CATALOG: CatalogAchievement[] = TRACKS.flatMap(track =>
  track.tiers.map(tier => ({
    key: `${track.id}_${tier.threshold}`,
    trackId: track.id,
    metric: track.metric,
    threshold: tier.threshold * track.scale,
    name: tier.name,
    description: `${track.blurb}: ${formatThreshold(track, tier.threshold)}`,
    rarity: tier.rarity,
    icon: track.icon,
    xp: RARITY_XP[tier.rarity],
  }))
);

const CATALOG_BY_KEY = new Map(CATALOG.map(a => [a.key, a]));

export function getCatalogAchievement(key: string): CatalogAchievement | undefined {
  return CATALOG_BY_KEY.get(key);
}

export function metricValue(stats: AthleteStats, level: number, metric: CatalogMetric): number {
  if (metric === 'level') return level;
  return stats[metric] ?? 0;
}

/** Osiągnięcia katalogu, na które statystyki już wystarczają, a nie są jeszcze odblokowane. */
export function evaluateCatalog(stats: AthleteStats, level: number, unlockedKeys: Iterable<string>): CatalogAchievement[] {
  const unlocked = new Set(unlockedKeys);
  return CATALOG.filter(a => !unlocked.has(a.key) && metricValue(stats, level, a.metric) >= a.threshold);
}

export interface TrackTierView {
  key: string;
  name: string;
  description: string;
  threshold: number;
  rarity: Rarity;
  xp: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface TrackView {
  id: string;
  title: string;
  blurb: string;
  unit: string;
  icon: string;
  /** Aktualna wartość w jednostce wyświetlanej. */
  value: number;
  tiers: TrackTierView[];
  unlockedCount: number;
  /** Najbliższy niezdobyty próg (w jednostce wyświetlanej) albo null, gdy ścieżka ukończona. */
  nextThreshold: number | null;
  /** Postęp 0–1 od poprzedniego progu do następnego. */
  progressToNext: number;
}

export function buildTracks(
  stats: AthleteStats,
  level: number,
  unlocked: { key: string; unlockedAt?: Date | string }[]
): TrackView[] {
  const unlockedAt = new Map(unlocked.map(u => [u.key, u.unlockedAt]));

  return TRACKS.map(track => {
    const raw = metricValue(stats, level, track.metric);
    const value = Math.round((raw / track.scale) * 10) / 10;

    const tiers: TrackTierView[] = track.tiers.map(tier => {
      const key = `${track.id}_${tier.threshold}`;
      const at = unlockedAt.get(key);
      return {
        key,
        name: tier.name,
        description: `${track.blurb}: ${formatThreshold(track, tier.threshold)}`,
        threshold: tier.threshold,
        rarity: tier.rarity,
        xp: RARITY_XP[tier.rarity],
        unlocked: unlockedAt.has(key),
        unlockedAt: at ? new Date(at).toISOString() : undefined,
      };
    });

    const nextIndex = tiers.findIndex(tier => !tier.unlocked);
    const next = nextIndex === -1 ? null : tiers[nextIndex];
    const previous = nextIndex > 0 ? tiers[nextIndex - 1].threshold : 0;
    const progressToNext = next
      ? Math.max(0, Math.min(1, (raw / track.scale - previous) / (next.threshold - previous)))
      : 1;

    return {
      id: track.id,
      title: track.title,
      blurb: track.blurb,
      unit: track.unit,
      icon: track.icon,
      value,
      tiers,
      unlockedCount: tiers.filter(tier => tier.unlocked).length,
      nextThreshold: next?.threshold ?? null,
      progressToNext,
    };
  });
}
