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
  unit: 't' | 'kg' | 'km' | 'dni' | 'tyg.' | 'h' | '';
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

/**
 * Progi w każdej ścieżce rosną wykładniczo (mniej więcej ×2–2,5 na próg):
 * pierwsze wpadają w pierwszych tygodniach, epickie po miesiącach, a legendarne
 * wymagają kilku lat regularnego trenowania (~4 treningi w tygodniu).
 * Kluczem osiągnięcia jest `${id}_${threshold}` — istniejących progów nie
 * wolno usuwać ani zmieniać, bo użytkownicy mają je już odblokowane.
 */
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
      t(50, 'Ciężarówka', 'common'),
      t(100, 'Sto ton', 'rare'),
      t(250, 'Lokomotywa', 'rare'),
      t(500, 'Pół tysiąca ton', 'rare'),
      t(1000, 'Tysiąc ton', 'epic'),
      t(2500, 'Prom kosmiczny', 'epic'),
      t(5000, 'Tytan tonażu', 'legendary'),
      t(10000, 'Wieża Eiffla', 'legendary'),
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
    tiers: [
      t(2, 'Dwie tony na raz', 'common'),
      t(5, 'Pięć ton na raz', 'rare'),
      t(10, 'Dziesięć ton na raz', 'epic'),
      t(20, 'Dwadzieścia ton na raz', 'legendary'),
      t(30, 'Trzydzieści ton na raz', 'legendary'),
    ],
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
      t(25, 'Stały bywalec', 'common'),
      t(50, 'Pięćdziesiątka', 'rare'),
      t(100, 'Setka', 'rare'),
      t(250, 'Weteran', 'epic'),
      t(500, 'Żelazna legenda', 'epic'),
      t(750, 'Niezniszczalny', 'legendary'),
      t(1000, 'Tysiąc treningów', 'legendary'),
    ],
  },
  {
    id: 'active_days',
    title: 'Aktywne dni',
    blurb: 'Dni z treningiem, biegiem lub inną aktywnością',
    metric: 'activeDays',
    unit: 'dni',
    scale: 1,
    icon: 'calendar-days',
    tiers: [
      t(7, 'Tydzień w ruchu', 'common'),
      t(30, 'Miesiąc w ruchu', 'common'),
      t(100, 'Sto aktywnych dni', 'rare'),
      t(250, 'Ćwierć tysiąca dni', 'epic'),
      t(500, 'Pięćset aktywnych dni', 'epic'),
      t(1000, 'Tysiąc aktywnych dni', 'legendary'),
      t(1500, 'Styl życia', 'legendary'),
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
      t(7, 'Pełny tydzień', 'common'),
      t(14, 'Dwa tygodnie', 'rare'),
      t(30, 'Miesiąc bez przerwy', 'rare'),
      t(60, 'Dwa miesiące', 'epic'),
      t(100, 'Sto dni', 'epic'),
      t(200, 'Dwieście dni', 'legendary'),
      t(365, 'Rok bez przerwy', 'legendary'),
    ],
  },
  {
    id: 'week_streak',
    title: 'Seria tygodni',
    blurb: 'Tygodnie z rzędu z min. 3 aktywnymi dniami',
    metric: 'weekStreak',
    unit: 'tyg.',
    scale: 1,
    icon: 'calendar-range',
    tiers: [
      t(2, 'Dwa tygodnie z rzędu', 'common'),
      t(4, 'Miesiąc regularności', 'common'),
      t(8, 'Dwa miesiące regularności', 'rare'),
      t(16, 'Cztery miesiące regularności', 'rare'),
      t(26, 'Pół roku regularności', 'epic'),
      t(52, 'Rok regularności', 'epic'),
      t(104, 'Dwa lata regularności', 'legendary'),
      t(156, 'Trzy lata regularności', 'legendary'),
    ],
  },
  {
    id: 'sets',
    title: 'Serie',
    blurb: 'Ukończone serie',
    metric: 'totalSets',
    unit: '',
    scale: 1,
    icon: 'layers',
    tiers: [
      t(100, 'Sto serii', 'common'),
      t(500, 'Pięćset serii', 'common'),
      t(1500, 'Półtora tysiąca serii', 'rare'),
      t(4000, 'Cztery tysiące serii', 'epic'),
      t(10000, 'Dziesięć tysięcy serii', 'legendary'),
      t(20000, 'Maszyna do serii', 'legendary'),
    ],
  },
  {
    id: 'reps',
    title: 'Powtórzenia',
    blurb: 'Wykonane powtórzenia',
    metric: 'totalReps',
    unit: '',
    scale: 1,
    icon: 'repeat',
    tiers: [
      t(1000, 'Tysiąc powtórzeń', 'common'),
      t(5000, 'Pięć tysięcy powtórzeń', 'common'),
      t(15000, 'Piętnaście tysięcy powtórzeń', 'rare'),
      t(40000, 'Czterdzieści tysięcy powtórzeń', 'epic'),
      t(100000, 'Sto tysięcy powtórzeń', 'legendary'),
      t(200000, 'Jeszcze jedno powtórzenie', 'legendary'),
    ],
  },
  {
    id: 'hours',
    title: 'Czas treningu',
    blurb: 'Godziny spędzone na treningach',
    metric: 'totalMinutes',
    unit: 'h',
    scale: 60,
    icon: 'timer',
    tiers: [
      t(10, 'Dziesięć godzin', 'common'),
      t(50, 'Pięćdziesiąt godzin', 'common'),
      t(150, 'Sto pięćdziesiąt godzin', 'rare'),
      t(400, 'Czterysta godzin', 'epic'),
      t(1000, 'Tysiąc godzin', 'legendary'),
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
      t(10, 'Łowca rekordów', 'common'),
      t(25, 'Seryjny rekordzista', 'rare'),
      t(50, 'Pięćdziesiąt rekordów', 'rare'),
      t(100, 'Sto rekordów', 'epic'),
      t(200, 'Dwieście rekordów', 'epic'),
      t(400, 'Bez sufitu', 'legendary'),
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
      t(5, 'Pięć celów', 'common'),
      t(10, 'Dziesięć celów', 'rare'),
      t(25, 'Zawsze u celu', 'epic'),
      t(50, 'Pięćdziesiąt celów', 'legendary'),
      t(100, 'Sto celów', 'legendary'),
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
      t(100, 'Sto kilometrów', 'common'),
      t(500, 'Pięćset kilometrów', 'rare'),
      t(1000, 'Tysiąc kilometrów', 'epic'),
      t(2500, 'Przez całą Europę', 'epic'),
      t(5000, 'Pięć tysięcy kilometrów', 'legendary'),
      t(10000, 'Ćwierć równika', 'legendary'),
    ],
  },
  {
    id: 'runs',
    title: 'Biegi',
    blurb: 'Zapisane biegi',
    metric: 'runCount',
    unit: '',
    scale: 1,
    icon: 'route',
    tiers: [
      t(1, 'Pierwszy bieg', 'common'),
      t(10, 'Dziesięć biegów', 'common'),
      t(50, 'Pięćdziesiąt biegów', 'rare'),
      t(150, 'Sto pięćdziesiąt biegów', 'epic'),
      t(400, 'Czterysta biegów', 'legendary'),
      t(1000, 'Tysiąc biegów', 'legendary'),
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
      t(50, 'Nawyk wchodzi w krew', 'common'),
      t(200, 'Dwieście odhaczeń', 'rare'),
      t(500, 'Człowiek rutyny', 'epic'),
      t(1000, 'Tysiąc odhaczeń', 'epic'),
      t(2500, 'Żelazna dyscyplina', 'legendary'),
      t(5000, 'Pięć tysięcy odhaczeń', 'legendary'),
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
    tiers: [
      t(1, 'Pierwszy pomiar', 'common'),
      t(10, 'Dziesięć pomiarów', 'common'),
      t(50, 'Kronikarz formy', 'rare'),
      t(100, 'Sto pomiarów', 'epic'),
      t(250, 'Archiwum formy', 'legendary'),
    ],
  },
  {
    id: 'early',
    title: 'Ranny ptaszek',
    blurb: 'Treningi zakończone przed 7:00',
    metric: 'earlyWorkouts',
    unit: '',
    scale: 1,
    icon: 'sunrise',
    tiers: [
      t(1, 'Przed świtem', 'common'),
      t(10, 'Ranny ptaszek', 'rare'),
      t(50, 'Zawsze o świcie', 'epic'),
      t(150, 'Budzik? Nie trzeba', 'legendary'),
      t(400, 'Władca poranków', 'legendary'),
    ],
  },
  {
    id: 'weekend',
    title: 'Weekendowy wojownik',
    blurb: 'Treningi w sobotę i niedzielę',
    metric: 'weekendWorkouts',
    unit: '',
    scale: 1,
    icon: 'sun',
    tiers: [
      t(5, 'Aktywny weekend', 'common'),
      t(25, 'Weekendowy wojownik', 'rare'),
      t(100, 'Weekend należy do mnie', 'epic'),
      t(250, 'Bez wolnego', 'legendary'),
      t(400, 'Czterysta weekendowych treningów', 'legendary'),
    ],
  },
  {
    id: 'gyms',
    title: 'Odkrywca',
    blurb: 'Różne siłownie, w których trenowałeś',
    metric: 'distinctGyms',
    unit: '',
    scale: 1,
    icon: 'map-pin',
    tiers: [
      t(3, 'Trzy siłownie', 'rare'),
      t(10, 'Dziesięć siłowni', 'epic'),
      t(25, 'Dwadzieścia pięć siłowni', 'legendary'),
      t(50, 'Siłowniany globtroter', 'legendary'),
    ],
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
      t(10, 'Dziesiąty poziom', 'common'),
      t(15, 'Piętnasty poziom', 'common'),
      t(20, 'Dwudziesty poziom', 'rare'),
      t(30, 'Trzydziesty poziom', 'rare'),
      t(40, 'Czterdziesty poziom', 'epic'),
      t(50, 'Pięćdziesiąty poziom', 'legendary'),
      t(60, 'Sześćdziesiąty poziom', 'legendary'),
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
