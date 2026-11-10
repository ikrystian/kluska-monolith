import { connectToDatabase } from '@/lib/mongodb';
import { WorkoutLog } from '@/models/WorkoutLog';
import { RunningSession } from '@/models/RunningSession';
import { StravaActivity } from '@/models/StravaActivity';
import { PersonalRecord } from '@/models/PersonalRecord';
import { Goal } from '@/models/Goal';
import { HabitLog } from '@/models/HabitLog';
import { BodyMeasurement } from '@/models/BodyMeasurement';
import { computeStreaks, dayKey, localClock, shiftDayKey, weekStartKey } from './streaks';

/** Statystyki tygodnia (pon–ndz) — napędzają wyzwania tygodnia. */
export interface WeekStats {
  weekKey: string;
  workouts: number;
  volumeKg: number;
  activeDays: number;
  runKm: number;
}

/**
 * Jedna kanoniczna definicja „dorobku” sportowca. Wszystkie nagrody, cele
 * automatyczne i wyzwania liczą się z tych liczb.
 */
export interface AthleteStats {
  /** Suma ciężar × powtórzenia z ukończonych serii ćwiczeń siłowych. */
  totalVolumeKg: number;
  bestWorkoutVolumeKg: number;
  workoutCount: number;
  totalSets: number;
  totalReps: number;
  totalMinutes: number;
  distinctGyms: number;
  /** Treningi zakończone przed 7:00. */
  earlyWorkouts: number;
  weekendWorkouts: number;
  activeDays: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastActiveDay: string | null;
  runKm: number;
  runCount: number;
  prCount: number;
  goalsCompleted: number;
  habitCompletions: number;
  measurementsCount: number;
  week: WeekStats;
  /** Średnie z 4 poprzednich tygodni — punkt odniesienia dla wyzwań. */
  baseline: { workoutsPerWeek: number; volumePerWeekKg: number };
}

export type StatMetric = Exclude<keyof AthleteStats, 'week' | 'baseline' | 'lastActiveDay'>;

export interface LogLike {
  endTime?: Date | string | null;
  startTime?: Date | string | null;
  duration?: number | null;
  gymId?: string | null;
  exercises?: {
    exerciseId?: string;
    exercise?: { type?: string | null; name?: string } | null;
    sets?: { weight?: number | null; reps?: number | null; duration?: number | null; completed?: boolean }[];
  }[];
}

/** Objętość jednego treningu: tylko ćwiczenia siłowe i tylko odhaczone serie. */
export function workoutVolumeKg(log: LogLike): number {
  let volume = 0;
  for (const series of log.exercises ?? []) {
    if (series.exercise?.type !== 'weight') continue;
    for (const set of series.sets ?? []) {
      if (!set.completed) continue;
      volume += (set.weight ?? 0) * (set.reps ?? 0);
    }
  }
  return volume;
}

export interface ActivityInput {
  logs: LogLike[];
  /** Biegi: data + dystans w km. */
  runs: { date: Date | string; km: number }[];
  /** Inne aktywności (np. Strava poza bieganiem) — liczą się tylko do aktywnych dni. */
  otherActivityDates: (Date | string)[];
  prCount: number;
  goalsCompleted: number;
  habitCompletions: number;
  measurementsCount: number;
}

/** Czysta agregacja — cała arytmetyka statystyk w jednym miejscu. */
export function summarizeActivity(input: ActivityInput, now: Date = new Date()): AthleteStats {
  const todayKey = dayKey(now);
  const weekKey = weekStartKey(todayKey);
  const baselineStart = shiftDayKey(weekKey, -28);

  const activeDays = new Set<string>();
  const weekDays = new Set<string>();
  const gyms = new Set<string>();

  let totalVolumeKg = 0;
  let bestWorkoutVolumeKg = 0;
  let totalSets = 0;
  let totalReps = 0;
  let totalMinutes = 0;
  let earlyWorkouts = 0;
  let weekendWorkouts = 0;
  let weekWorkouts = 0;
  let weekVolume = 0;
  let baselineWorkouts = 0;
  let baselineVolume = 0;

  for (const log of input.logs) {
    const when = log.endTime ?? log.startTime;
    const volume = workoutVolumeKg(log);
    totalVolumeKg += volume;
    if (volume > bestWorkoutVolumeKg) bestWorkoutVolumeKg = volume;
    totalMinutes += log.duration ?? 0;
    if (log.gymId) gyms.add(log.gymId);

    for (const series of log.exercises ?? []) {
      for (const set of series.sets ?? []) {
        if (!set.completed) continue;
        totalSets += 1;
        totalReps += set.reps ?? 0;
      }
    }

    if (!when) continue;
    const key = dayKey(when);
    activeDays.add(key);
    const clock = localClock(when);
    if (clock.hour < 7) earlyWorkouts += 1;
    if (clock.weekend) weekendWorkouts += 1;

    if (key >= weekKey) {
      weekWorkouts += 1;
      weekVolume += volume;
      weekDays.add(key);
    } else if (key >= baselineStart) {
      baselineWorkouts += 1;
      baselineVolume += volume;
    }
  }

  let runKm = 0;
  let weekRunKm = 0;
  for (const run of input.runs) {
    const key = dayKey(run.date);
    runKm += run.km;
    activeDays.add(key);
    if (key >= weekKey) {
      weekRunKm += run.km;
      weekDays.add(key);
    }
  }

  for (const date of input.otherActivityDates) {
    const key = dayKey(date);
    activeDays.add(key);
    if (key >= weekKey) weekDays.add(key);
  }

  const streaks = computeStreaks(activeDays, todayKey);

  return {
    totalVolumeKg: Math.round(totalVolumeKg),
    bestWorkoutVolumeKg: Math.round(bestWorkoutVolumeKg),
    workoutCount: input.logs.length,
    totalSets,
    totalReps,
    totalMinutes: Math.round(totalMinutes),
    distinctGyms: gyms.size,
    earlyWorkouts,
    weekendWorkouts,
    activeDays: streaks.activeDays,
    currentStreakDays: streaks.current,
    longestStreakDays: streaks.longest,
    lastActiveDay: streaks.lastActiveDay,
    runKm: Math.round(runKm * 10) / 10,
    runCount: input.runs.length,
    prCount: input.prCount,
    goalsCompleted: input.goalsCompleted,
    habitCompletions: input.habitCompletions,
    measurementsCount: input.measurementsCount,
    week: {
      weekKey,
      workouts: weekWorkouts,
      volumeKg: Math.round(weekVolume),
      activeDays: weekDays.size,
      runKm: Math.round(weekRunKm * 10) / 10,
    },
    baseline: {
      workoutsPerWeek: baselineWorkouts / 4,
      volumePerWeekKg: Math.round(baselineVolume / 4),
    },
  };
}

const RUN_TYPES = /run/i;

export async function computeAthleteStats(userId: string, now: Date = new Date()): Promise<AthleteStats> {
  await connectToDatabase();

  const [logs, runs, strava, prCount, goalsCompleted, habitCompletions, measurementsCount] = await Promise.all([
    WorkoutLog.find({ athleteId: userId, status: 'completed' })
      .select(
        'endTime startTime duration gymId exercises.exerciseId exercises.exercise.type exercises.sets.weight exercises.sets.reps exercises.sets.completed'
      )
      .lean(),
    RunningSession.find({ ownerId: userId }).select('date distance').lean(),
    StravaActivity.find({ ownerId: userId }).select('date distance type').lean(),
    PersonalRecord.countDocuments({ athleteId: userId }),
    Goal.countDocuments({ ownerId: userId, status: 'completed' }),
    HabitLog.countDocuments({ ownerId: userId, completed: true }),
    BodyMeasurement.countDocuments({ ownerId: userId }),
  ]);

  const stravaRuns = strava.filter(a => RUN_TYPES.test(a.type));

  return summarizeActivity(
    {
      logs: logs as unknown as LogLike[],
      runs: [
        ...runs.map(r => ({ date: r.date, km: r.distance })),
        ...stravaRuns.map(a => ({ date: a.date, km: a.distance / 1000 })),
      ],
      otherActivityDates: strava.filter(a => !RUN_TYPES.test(a.type)).map(a => a.date),
      prCount,
      goalsCompleted,
      habitCompletions,
      measurementsCount,
    },
    now
  );
}
