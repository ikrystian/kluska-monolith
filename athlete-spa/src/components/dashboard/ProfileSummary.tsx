import { useMemo, useState, type ReactNode } from 'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Activity, CalendarDays, CalendarRange, Dumbbell, Flame, Footprints, Layers, Medal, Mountain, Repeat, Scale, Timer, Trophy, type LucideIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tile, TileLabel, TileValue } from '@/components/dashboard/tiles';
import { presetRange, rangeLabel, SummaryRangeDialog, type SummaryRange } from '@/components/dashboard/SummaryRangeDialog';
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
import { resolveMediaUrl } from '@/lib/api-client';
import { useCollection, useDoc, useUser } from '@/lib/db-hooks';
import type { BodyMeasurement, PersonalRecord, RunningSession, StravaActivity, UserProfile, WorkoutLog } from '@/lib/types';

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
  <div className="flex min-w-0 flex-col rounded-2xl bg-black/20 p-3 backdrop-blur-sm">
    <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">{label}</p>
    {isLoading ? (
      <Skeleton className="mt-2 h-8 w-16 bg-white/20" />
    ) : (
      <p className="mt-1.5 truncate font-display text-[1.65rem] font-extrabold leading-none tabular-nums md:text-4xl">
        <CountUp value={value} digits={digits} />
        {unit && <span className="ml-1 text-xs font-bold text-white/75 md:text-sm">{unit}</span>}
      </p>
    )}
    {note && !isLoading && <p className="mt-1.5 text-[10px] font-semibold leading-tight text-white/80 md:text-[11px]">{note}</p>}
  </div>
);

const StatTile = ({
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
  <Tile className={className}>
    <div className="flex items-center justify-between gap-2">
      <TileLabel>{label}</TileLabel>
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
        style={{ backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
    </div>
    <TileValue value={value} unit={unit} isLoading={isLoading} />
    {hint && <p className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</p>}
  </Tile>
);

const GroupHeader = ({ title, color }: { title: string; color: string }) => (
  <h3 className="col-span-full mt-2 flex items-center gap-2 font-headline text-base font-bold tracking-tight">
    <span className="h-4 w-1 rounded-full" style={{ backgroundColor: color }} />
    {title}
  </h3>
);

/* ---------- Main component ---------- */

/**
 * "Profile card" style summary of the athlete's activity in a chosen date range:
 * running distance, lifted tonnage, workout count and supporting stats.
 */
export function ProfileSummary() {
  const { user } = useUser();
  const { data: userProfile } = useDoc<UserProfile>(user ? 'users' : null, user?.uid || null);

  const [range, setRange] = useState<SummaryRange>(() => presetRange('year'));
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const name = userProfile?.name || 'Sportowiec';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  const strengthTime = fmtDuration(summary.workoutMinutes);
  const runTime = fmtDuration(summary.runMinutes);
  const isEmpty = !isLoading && summary.workoutCount === 0 && summary.runCount === 0;

  const equatorPct = (summary.runKm / EQUATOR_KM) * 100;
  const tanks = summary.tons / T55_TONS;

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Profile card */}
      <section className="hero-ember texture-grain relative overflow-hidden rounded-[1.75rem] p-5 text-white shadow-glow">
        <div aria-hidden className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full border-[1.25rem] border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full border-[1rem] border-white/5" />

        <div className="relative flex justify-end gap-3">

          <Button
            type="button"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="shrink-0 gap-1.5 bg-white text-primary shadow-lg hover:bg-white/90"
          >
            <CalendarRange className="h-3.5 w-3.5" />
            {rangeLabel(range)}
          </Button>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2 md:gap-3">
          <HeroStat
            label="Kilometry"
            value={summary.runKm}
            digits={1}
            unit="km"
            note={equatorPct >= 100 ? `${fmtNumber(equatorPct / 100, 2)}× równik` : `${fmtRatio(equatorPct)}% równika`}
            isLoading={isLoading}
          />
          <HeroStat
            label="Podniesione"
            value={summary.tons}
            digits={1}
            unit="t"
            note={`${fmtRatio(tanks)} × T-55`}
            isLoading={isLoading}
          />
          <HeroStat
            label="Treningi"
            value={summary.workoutCount + summary.runCount}
            note={`${summary.activeDays} aktywnych dni`}
            isLoading={isLoading}
          />
        </div>
      </section>

      {isEmpty && (
        <div className="rounded-[1.75rem] border border-dashed border-border bg-card/50 p-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary">
            <Activity className="h-6 w-6" />
          </span>
          <p className="text-sm text-muted-foreground">Brak aktywności w wybranym okresie.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setDialogOpen(true)}>
            Zmień zakres
          </Button>
        </div>
      )}

      {/* Fun comparisons */}
      <section className="grid gap-3 md:grid-cols-2 md:gap-4">
        <EquatorCard km={summary.runKm} isLoading={isLoading} />
        <TankCard tons={summary.tons} isLoading={isLoading} />
      </section>

      <ActivityTrend entries={summary.entries} from={range.from} to={range.to} isLoading={isLoading} />

      <TimeSplit strengthMinutes={summary.workoutMinutes} runMinutes={summary.runMinutes} formatMinutes={fmtDurationText} />

      {/* Detailed stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <GroupHeader title="Bieganie" color={SUMMARY_COLORS.running} />
        <StatTile label="Biegi" icon={Footprints} accent={SUMMARY_COLORS.running} value={summary.runCount} hint={`${runTime.value} ${runTime.unit} w biegu`} isLoading={isLoading} />
        <StatTile label="Śr. tempo" icon={Timer} accent={SUMMARY_COLORS.running} value={fmtPace(summary.avgPace)} unit="/km" isLoading={isLoading} />
        <StatTile label="Najdłuższy bieg" icon={Flame} accent={SUMMARY_COLORS.running} value={fmtNumber(summary.longestRunKm, 2)} unit="km" isLoading={isLoading} />
        <StatTile label="Przewyższenie" icon={Mountain} accent={SUMMARY_COLORS.running} value={fmtNumber(summary.elevation)} unit="m" hint="ze Stravy" isLoading={isLoading} />

        <GroupHeader title="Siłownia" color={SUMMARY_COLORS.strength} />
        <StatTile label="Serie" icon={Layers} accent={SUMMARY_COLORS.strength} value={fmtNumber(summary.sets)} hint={`${fmtNumber(summary.reps)} powtórzeń`} isLoading={isLoading} />
        <StatTile label="Czas na siłowni" icon={Dumbbell} accent={SUMMARY_COLORS.strength} value={strengthTime.value} unit={strengthTime.unit} hint={`${summary.workoutCount} treningów`} isLoading={isLoading} />
        <Tile className="col-span-2">
          <div className="flex items-center justify-between gap-2">
            <TileLabel>Ulubione ćwiczenie</TileLabel>
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${SUMMARY_COLORS.strength} 14%, transparent)`, color: SUMMARY_COLORS.strength }}
            >
              <Medal className="h-3.5 w-3.5" />
            </span>
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-7 w-40" />
          ) : summary.topExercise ? (
            <>
              <p className="mt-2 truncate font-headline text-xl font-bold tracking-tight">{summary.topExercise.name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Repeat className="h-3 w-3" />
                {summary.topExercise.sets} serii
                {summary.topExercise.volume > 0 && ` · ${fmtNumber(summary.topExercise.volume / 1000, 1)} t`}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Brak treningów siłowych</p>
          )}
        </Tile>

        <GroupHeader title="Forma" color={SUMMARY_COLORS.workouts} />
        <StatTile
          label="Aktywne dni"
          icon={CalendarDays}
          accent={SUMMARY_COLORS.workouts}
          value={summary.activeDays}
          hint={`najdłuższa seria: ${summary.bestStreak} dni`}
          isLoading={isLoading}
        />
        <StatTile
          label="Nowe rekordy"
          icon={Trophy}
          accent={SUMMARY_COLORS.workouts}
          value={personalRecords?.length ?? 0}
          hint="rekordy osobiste"
          isLoading={recordsLoading}
        />
        <StatTile
          label="Zmiana wagi"
          icon={Scale}
          accent={SUMMARY_COLORS.workouts}
          className="col-span-2"
          value={summary.weightChange === null ? '–' : `${summary.weightChange > 0 ? '+' : ''}${fmtNumber(summary.weightChange, 1)}`}
          unit={summary.weightChange === null ? undefined : 'kg'}
          hint={summary.weightChange === null ? 'za mało pomiarów' : 'pierwszy → ostatni pomiar'}
          isLoading={measurementsLoading}
        />
      </section>

      <SummaryRangeDialog open={dialogOpen} onOpenChange={setDialogOpen} value={range} onApply={setRange} />
    </div>
  );
}
