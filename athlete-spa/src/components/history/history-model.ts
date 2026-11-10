import { differenceInMinutes, format, startOfDay, startOfWeek, addDays, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { WorkoutLog } from '@/lib/types';
import type { RunActivity } from '@/components/running/running-format';

export interface WorkoutHistoryItem {
  kind: 'workout';
  id: string;
  date: Date;
  log: WorkoutLog;
  stats: WorkoutStats;
}

export interface RunHistoryItem {
  kind: 'run';
  id: string;
  date: Date;
  run: RunActivity;
}

export type HistoryItem = WorkoutHistoryItem | RunHistoryItem;
export type HistoryFilter = 'all' | 'workout' | 'run';

export interface WorkoutStats {
  /** Σ reps × weight over weight exercises — the same number the detail screen shows. */
  volume: number;
  sets: number;
  durationMin?: number;
  records: number;
}

export function workoutStats(log: WorkoutLog): WorkoutStats {
  let volume = 0;
  let sets = 0;
  for (const series of log.exercises ?? []) {
    const isWeight = !series.exercise?.type || series.exercise.type === 'weight';
    for (const set of series.sets ?? []) {
      sets += 1;
      if (isWeight) volume += (set.weight || 0) * (set.reps || 0);
    }
  }

  let durationMin = log.duration && log.duration > 0 ? log.duration : undefined;
  if (!durationMin && log.startTime && log.endTime) {
    const diff = differenceInMinutes(new Date(log.endTime), new Date(log.startTime));
    if (diff > 0) durationMin = diff;
  }

  return { volume, sets, durationMin, records: log.newRecords?.length ?? 0 };
}

export function workoutItem(log: WorkoutLog): WorkoutHistoryItem {
  return { kind: 'workout', id: log.id, date: new Date(log.endTime), log, stats: workoutStats(log) };
}

export function runItem(run: RunActivity): RunHistoryItem {
  return { kind: 'run', id: `${run.source}-${run.id}`, date: run.date, run };
}

/* ------------------------------------------------------------------ */
/* Month groups                                                        */
/* ------------------------------------------------------------------ */

export interface MonthGroup {
  key: string;
  label: string;
  items: HistoryItem[];
  volume: number;
  km: number;
}

export function totalsOf(items: HistoryItem[]) {
  let volume = 0;
  let km = 0;
  let workouts = 0;
  let runs = 0;
  for (const item of items) {
    if (item.kind === 'workout') {
      workouts += 1;
      volume += item.stats.volume;
    } else {
      runs += 1;
      km += item.run.distanceKm;
    }
  }
  return { volume, km, workouts, runs };
}

/** Items (already newest first) bucketed by calendar month. */
export function groupByMonth(items: HistoryItem[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const item of items) {
    const key = format(item.date, 'yyyy-MM');
    let group = groups.get(key);
    if (!group) {
      group = { key, label: format(item.date, 'LLLL yyyy', { locale: pl }), items: [], volume: 0, km: 0 };
      groups.set(key, group);
    }
    group.items.push(item);
  }
  for (const group of groups.values()) {
    const { volume, km } = totalsOf(group.items);
    group.volume = volume;
    group.km = km;
  }
  return [...groups.values()];
}

/* ------------------------------------------------------------------ */
/* Last four weeks                                                     */
/* ------------------------------------------------------------------ */

export interface CalendarDay {
  date: Date;
  key: string;
  workout: boolean;
  run: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/** 4 × 7 grid, Monday-first, ending on the week that contains `today`. */
export function lastFourWeeks(items: HistoryItem[], today: Date): CalendarDay[] {
  const todayStart = startOfDay(today);
  const gridStart = subDays(startOfWeek(todayStart, { weekStartsOn: 1 }), 21);

  const workoutDays = new Set<string>();
  const runDays = new Set<string>();
  for (const item of items) {
    const key = format(item.date, 'yyyy-MM-dd');
    (item.kind === 'workout' ? workoutDays : runDays).add(key);
  }

  return Array.from({ length: 28 }, (_, i) => {
    const date = addDays(gridStart, i);
    const key = format(date, 'yyyy-MM-dd');
    return {
      date,
      key,
      workout: workoutDays.has(key),
      run: runDays.has(key),
      isToday: date.getTime() === todayStart.getTime(),
      isFuture: date.getTime() > todayStart.getTime(),
    };
  });
}

/** Sessions in the 30 days up to `today`, and in the 30 days before that. */
export function rollingWindows(items: HistoryItem[], today: Date) {
  const end = addDays(startOfDay(today), 1).getTime();
  const mid = subDays(new Date(end), 30).getTime();
  const start = subDays(new Date(end), 60).getTime();

  const current: HistoryItem[] = [];
  let previousCount = 0;
  for (const item of items) {
    const t = item.date.getTime();
    if (t >= mid && t < end) current.push(item);
    else if (t >= start && t < mid) previousCount += 1;
  }
  return { current, previousCount };
}
