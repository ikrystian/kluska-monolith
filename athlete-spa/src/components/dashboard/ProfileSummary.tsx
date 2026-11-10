import { useMemo, useState, type ReactNode } from 'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Activity, CalendarDays, CalendarRange, ChevronDown, Dumbbell, Flame, Footprints, Layers, Medal, Mountain, Repeat, Scale, Timer, Trophy, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { presetRange, rangeLabel, SummaryRangeDialog, type RangePreset, type SummaryRange } from '@/components/dashboard/SummaryRangeDialog';
import {
  ActivityTrend,
  CountUp,
  EQUATOR_KM,
  EquatorCard,
  SUMMARY_COLORS,
  T55_TONS,
  TankCard,
  TimeSplit,
  fmtNumber,
  type ActivityEntry,
} from '@/components/dashboard/summary-visuals';
import { useCollection, useUser } from '@/lib/db-hooks';
import { cn } from '@/lib/utils';
import type { BodyMeasurement, PersonalRecord, RunningSession, StravaActivity, WorkoutLog } from '@/lib/types';

/* ---------- Formatting helpers ---------- */

function fmtDuration(totalMinutes: number): { value: string; unit: string } {
  const minutes = Math.round(totalMinutes);
  if (minutes < 60) return { value: String(minutes), unit: 'min' };
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return { value: m > 0 ? `${h} h ${m}` : String(h), unit: m > 0 ? 'min' : 'h' };
}

const fmtDurationText = (minutes: number) => {
  const d = fmtDuration(minutes);
  return `${d.value} ${d.unit}`;
};

function fmtPace(minPerKm: number): string {
  if (!Number.isFinite(minPerKm) || minPerKm <= 0) return '–';
  const totalSeconds = Math.round(minPerKm * 60);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

/** Short ratio for the hero notes; tiny-but-nonzero values don't round down to 0. */
function fmtRatio(value: number): string {
  if (value > 0 && value < 0.01) return '< 0,01';
  return fmtNumber(value, value < 1 ? 2 : 1);
}

const dayKey = (date: string | Date) => format(new Date(date), 'yyyy-MM-dd');

/** Longest run of consecutive calendar days present in `keys` (yyyy-MM-dd). */
function longestStreak(keys: Set<string>): number {
  const sorted = [...keys].sort();
  let best = 0;
  let current = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const d = parseISO(key);
    current = prev && differenceInCalendarDays(d, prev) === 1 ? current + 1 : 1;
    best = Math.max(best, current);
    prev = d;
  }
  return best;
}

/* ---------- UI pieces ---------- */

const HeroStat = ({
  label,
  value,
  digits = 0,
  unit,
  note,
  isLoading,
}: {
  label: string;
  value: number;
  digits?: number;
  unit?: string;
  note?: string;
  isLoading: boolean;
}) => (
  <div className="flex min-w-0 flex-col px-3 first:pl-0 last:pr-0">
    <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-primary-foreground/70">{label}</p>
    {isLoading ? (
      <Skeleton className="mt-2 h-9 w-16 bg-primary-foreground/20" />
    ) : (
      <p className="mt-1 truncate font-display text-[2.1rem] font-bold leading-none tabular-nums">
        <CountUp value={value} digits={digits} />
        {unit && <span className="ml-0.5 text-sm font-bold text-primary-foreground/70">{unit}</span>}
      </p>
    )}
    {note && !isLoading && <p className="mt-1.5 text-[11px] font-medium leading-tight text-primary-foreground/80">{note}</p>}
  </div>
);

/** One number inside a stat group card. */
const StatCell = ({
  label,
  icon: Icon,
  accent,
  value,
  unit,
  hint,
  isLoading,
  className,
}: {
  label: string;
  icon: LucideIcon;
  accent: string;
  value: string | number;
  unit?: string;
  hint?: ReactNode;
  isLoading: boolean;
  className?: string;
}) => (
  <div className={cn('min-w-0', className)}>
    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
      <span className="truncate">{label}</span>
    </p>
    {isLoading ? (
      <Skeleton className="mt-1.5 h-7 w-16" />
    ) : (
      <p className="mt-1 truncate font-display text-[1.6rem] font-bold leading-none tabular-nums">
        {value}
        {unit && <span className="ml-1 text-sm font-semibold text-muted-foreground">{unit}</span>}
      </p>
    )}
    {hint && <p className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

/** A card of related numbers (running, gym, form) under a coloured heading. */
const StatGroup = ({ title, color, children }: { title: string; color: string; children: ReactNode }) => (
  <section className="rounded-2xl bg-card p-4">
    <h3 className="flex items-center gap-2 font-headline text-base font-bold tracking-tight">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {title}
    </h3>
    <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-4">{children}</div>
  </section>
);

/* ---------- Range memory ---------- */

const RANGE_KEY = 'athlete-spa:summary-range';
const DEFAULT_PRESET: Exclude<RangePreset, 'custom'> = 'month';
const STORED_PRESETS: Exclude<RangePreset, 'custom'>[] = ['7d', '30d', 'month', 'year', 'all'];

/** The preset picked last time, so the profile opens on the period this athlete cares about. */
function initialRange(): SummaryRange {
  try {
    const stored = localStorage.getItem(RANGE_KEY) as Exclude<RangePreset, 'custom'> | null;
    if (stored && STORED_PRESETS.includes(stored)) return presetRange(stored);
  } catch {
    // Storage unavailable — fall back to the default period.
  }
  return presetRange(DEFAULT_PRESET);
}

function rememberRange(range: SummaryRange) {
  try {
    // A custom range goes stale quickly, so only presets are kept.
    if (range.preset === 'custom') localStorage.removeItem(RANGE_KEY);
    else localStorage.setItem(RANGE_KEY, range.preset);
  } catch {
    // Storage unavailable — the choice just won't survive a reload.
  }
}

/* ---------- Main component ---------- */

/**
 * "Profile card" style summary of the athlete's activity in a chosen date range:
 * running distance, lifted tonnage, workout count and supporting stats.
 * The period is remembered, so the profile opens on the one this athlete
 * cares about.
 */
export function ProfileSummary() {
  const { user } = useUser();

  const [range, setRangeState] = useState<SummaryRange>(initialRange);
  const [dialogOpen, setDialogOpen] = useState(false);
  const setRange = (next: SummaryRange) => {
    setRangeState(next);
    rememberRange(next);
  };

  const dateFilter = useMemo(
    () => ({ ...(range.from && { $gte: range.from.toISOString() }), $lte: range.to.toISOString() }),
    [range]
  );

  const { data: workoutLogs, isLoading: workoutsLoading } = useCollection<WorkoutLog>(
    user ? 'workoutLogs' : null,
    { athleteId: user?.uid, status: 'completed', endTime: dateFilter },
    { sort: { endTime: -1 } }
  );

  const { data: runningSessions, isLoading: runningLoading } = useCollection<RunningSession>(
    user ? 'runningSessions' : null,
    { ownerId: user?.uid, date: dateFilter }
  );

  const { data: stravaActivities, isLoading: stravaLoading } = useCollection<StravaActivity>(
    user ? 'stravaActivities' : null,
    { ownerId: user?.uid, date: dateFilter }
  );

  const { data: personalRecords, isLoading: recordsLoading } = useCollection<PersonalRecord>(
    user ? 'personalRecords' : null,
    { athleteId: user?.uid, achievedAt: dateFilter }
  );

  const { data: measurements, isLoading: measurementsLoading } = useCollection<BodyMeasurement>(
    user ? 'bodyMeasurements' : null,
    { ownerId: user?.uid, date: dateFilter },
    { sort: { date: 1 } }
  );

  const isLoading = workoutsLoading || runningLoading || stravaLoading;

  const summary = useMemo(() => {
    const workouts = workoutLogs ?? [];
    const activeDays = new Set<string>();
    const entries: ActivityEntry[] = [];

    // Strength
    let volumeKg = 0;
    let sets = 0;
    let reps = 0;
    let workoutMinutes = 0;
    const exerciseStats = new Map<string, { name: string; volume: number; sets: number }>();

    for (const w of workouts) {
      if (w.endTime) activeDays.add(dayKey(w.endTime));
      workoutMinutes +=
        w.duration ??
        (w.startTime && w.endTime ? Math.max(0, (new Date(w.endTime).getTime() - new Date(w.startTime).getTime()) / 60000) : 0);

      let workoutKg = 0;
      for (const ex of w.exercises ?? []) {
        const name = ex.exercise?.name || 'Ćwiczenie';
        const key = ex.exercise?.id || name;
        const entry = exerciseStats.get(key) ?? { name, volume: 0, sets: 0 };

        for (const set of ex.sets ?? []) {
          const performed = set.completed || (set.reps ?? 0) > 0 || (set.duration ?? 0) > 0;
          if (!performed) continue;
          sets++;
          entry.sets++;
          reps += set.reps || 0;
          if (ex.exercise?.type === 'weight' && set.weightUnit !== 'rpe') {
            const v = (set.reps || 0) * (set.weight || 0);
            workoutKg += v;
            entry.volume += v;
          }
        }
        exerciseStats.set(key, entry);
      }
      volumeKg += workoutKg;
      if (w.endTime) entries.push({ date: new Date(w.endTime), km: 0, kg: workoutKg, sessions: 1 });
    }

    const topExercise = [...exerciseStats.values()].sort((a, b) => b.volume - a.volume || b.sets - a.sets)[0];

    // Running (in-app sessions + Strava imports)
    const runs: { km: number; minutes: number }[] = [];
    let elevation = 0;
    for (const r of runningSessions ?? []) {
      activeDays.add(dayKey(r.date));
      runs.push({ km: r.distance || 0, minutes: r.duration || 0 });
      entries.push({ date: new Date(r.date), km: r.distance || 0, kg: 0, sessions: 1 });
    }
    for (const a of stravaActivities ?? []) {
      activeDays.add(dayKey(a.date));
      runs.push({ km: (a.distance || 0) / 1000, minutes: (a.movingTime || 0) / 60 });
      entries.push({ date: new Date(a.date), km: (a.distance || 0) / 1000, kg: 0, sessions: 1 });
      elevation += a.totalElevationGain || 0;
    }
    const runKm = runs.reduce((acc, r) => acc + r.km, 0);
    const runMinutes = runs.reduce((acc, r) => acc + r.minutes, 0);
    const longestRunKm = runs.reduce((acc, r) => Math.max(acc, r.km), 0);

    // Body weight change across the range
    const weighed = (measurements ?? []).filter(m => m.weight > 0);
    const weightChange = weighed.length >= 2 ? weighed[weighed.length - 1].weight - weighed[0].weight : null;

    return {
      entries,
      workoutCount: workouts.length,
      tons: volumeKg / 1000,
      sets,
      reps,
      workoutMinutes,
      topExercise: topExercise && topExercise.sets > 0 ? topExercise : null,
      runCount: runs.length,
      runKm,
      runMinutes,
      longestRunKm,
      avgPace: runKm > 0 ? runMinutes / runKm : 0,
      elevation,
      activeDays: activeDays.size,
      bestStreak: longestStreak(activeDays),
      weightChange,
    };
  }, [workoutLogs, runningSessions, stravaActivities, measurements]);

  const strengthTime = fmtDuration(summary.workoutMinutes);
  const runTime = fmtDuration(summary.runMinutes);
  const isEmpty = !isLoading && summary.workoutCount === 0 && summary.runCount === 0;

  const equatorPct = (summary.runKm / EQUATOR_KM) * 100;
  const tanks = summary.tons / T55_TONS;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-headline text-lg font-bold tracking-tight">Podsumowanie</h2>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          aria-label={`Zakres podsumowania: ${rangeLabel(range)}. Zmień`}
          className="pressable inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-secondary pl-3 pr-2.5 text-xs font-semibold"
        >
          <CalendarRange className="h-3.5 w-3.5 text-primary" />
          {rangeLabel(range)}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Headline numbers */}
      <section className="relative overflow-hidden rounded-3xl bg-primary px-4 pb-4 pt-3.5 text-primary-foreground">
        <svg viewBox="0 0 200 200" aria-hidden className="pointer-events-none absolute -right-24 -top-28 h-56 w-56 opacity-[0.1]">
          <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="100" cy="100" r="44" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <div className="relative grid grid-cols-3 divide-x divide-primary-foreground/20">
          <HeroStat
            label="Kilometry"
            value={summary.runKm}
            digits={1}
            unit="km"
            note={equatorPct >= 100 ? `${fmtNumber(equatorPct / 100, 2)}× równik` : `${fmtRatio(equatorPct)}% równika`}
            isLoading={isLoading}
          />
          <HeroStat
            label="Tony"
            value={summary.tons}
            digits={1}
            unit="t"
            note={`${fmtRatio(tanks)} × T-55`}
            isLoading={isLoading}
          />
          <HeroStat
            label="Treningi"
            value={summary.workoutCount + summary.runCount}
            note={`${summary.activeDays} ${summary.activeDays === 1 ? 'aktywny dzień' : 'aktywnych dni'}`}
            isLoading={isLoading}
          />
        </div>
      </section>

      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
            <Activity className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted-foreground">Brak aktywności w wybranym okresie.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setDialogOpen(true)}>
            Zmień zakres
          </Button>
        </div>
      ) : (
        <>
          <ActivityTrend entries={summary.entries} from={range.from} to={range.to} isLoading={isLoading} />

          <TimeSplit strengthMinutes={summary.workoutMinutes} runMinutes={summary.runMinutes} formatMinutes={fmtDurationText} />

          {/* Fun comparisons */}
          <EquatorCard km={summary.runKm} isLoading={isLoading} />
          <TankCard tons={summary.tons} isLoading={isLoading} />

          {/* Detailed stats */}
          <StatGroup title="Bieganie" color={SUMMARY_COLORS.running}>
            <StatCell label="Biegi" icon={Footprints} accent={SUMMARY_COLORS.running} value={summary.runCount} hint={`${runTime.value} ${runTime.unit} w biegu`} isLoading={isLoading} />
            <StatCell label="Śr. tempo" icon={Timer} accent={SUMMARY_COLORS.running} value={fmtPace(summary.avgPace)} unit="/km" isLoading={isLoading} />
            <StatCell label="Najdłuższy bieg" icon={Flame} accent={SUMMARY_COLORS.running} value={fmtNumber(summary.longestRunKm, 2)} unit="km" isLoading={isLoading} />
            <StatCell label="Przewyższenie" icon={Mountain} accent={SUMMARY_COLORS.running} value={fmtNumber(summary.elevation)} unit="m" hint="ze Stravy" isLoading={isLoading} />
          </StatGroup>

          <StatGroup title="Siłownia" color={SUMMARY_COLORS.strength}>
            <StatCell label="Serie" icon={Layers} accent={SUMMARY_COLORS.strength} value={fmtNumber(summary.sets)} hint={`${fmtNumber(summary.reps)} powtórzeń`} isLoading={isLoading} />
            <StatCell label="Czas na siłowni" icon={Dumbbell} accent={SUMMARY_COLORS.strength} value={strengthTime.value} unit={strengthTime.unit} hint={`${summary.workoutCount} treningów`} isLoading={isLoading} />
            <div className="col-span-2 flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                style={{ backgroundColor: `color-mix(in srgb, ${SUMMARY_COLORS.strength} 16%, transparent)`, color: SUMMARY_COLORS.strength }}
              >
                <Medal className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground">Ulubione ćwiczenie</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-5 w-32" />
                ) : summary.topExercise ? (
                  <p className="truncate font-headline text-base font-bold tracking-tight">{summary.topExercise.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Brak treningów siłowych</p>
                )}
              </div>
              {!isLoading && summary.topExercise && (
                <p className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                  <Repeat className="h-3 w-3" />
                  {summary.topExercise.sets} serii
                  {summary.topExercise.volume > 0 && ` · ${fmtNumber(summary.topExercise.volume / 1000, 1)} t`}
                </p>
              )}
            </div>
          </StatGroup>

          <StatGroup title="Forma" color={SUMMARY_COLORS.workouts}>
            <StatCell
              label="Aktywne dni"
              icon={CalendarDays}
              accent={SUMMARY_COLORS.workouts}
              value={summary.activeDays}
              hint={`najdłuższa seria: ${summary.bestStreak} dni`}
              isLoading={isLoading}
            />
            <StatCell
              label="Nowe rekordy"
              icon={Trophy}
              accent={SUMMARY_COLORS.workouts}
              value={personalRecords?.length ?? 0}
              hint="rekordy osobiste"
              isLoading={recordsLoading}
            />
            <StatCell
              label="Zmiana wagi"
              icon={Scale}
              accent={SUMMARY_COLORS.workouts}
              className="col-span-2"
              value={summary.weightChange === null ? '–' : `${summary.weightChange > 0 ? '+' : ''}${fmtNumber(summary.weightChange, 1)}`}
              unit={summary.weightChange === null ? undefined : 'kg'}
              hint={summary.weightChange === null ? 'za mało pomiarów' : 'pierwszy → ostatni pomiar'}
              isLoading={measurementsLoading}
            />
          </StatGroup>
        </>
      )}

      <SummaryRangeDialog open={dialogOpen} onOpenChange={setDialogOpen} value={range} onApply={setRange} />
    </div>
  );
}
