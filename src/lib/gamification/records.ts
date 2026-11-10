import type { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { PersonalRecord } from '@/models/PersonalRecord';
import { WorkoutLog } from '@/models/WorkoutLog';
import type { LogLike } from './stats';

export type RecordType = 'max_weight' | 'max_reps' | 'max_duration';

export interface ExerciseBest {
  exerciseId: string;
  exerciseName: string;
  type: RecordType;
  value: number;
  /** Powtórzenia w serii, w której padł rekord ciężaru. */
  reps?: number;
}

function recordTypeFor(exerciseType?: string | null): RecordType {
  if (exerciseType === 'duration') return 'max_duration';
  if (exerciseType === 'reps') return 'max_reps';
  return 'max_weight';
}

/** Najlepszy wynik każdego ćwiczenia w jednym treningu (tylko odhaczone serie). */
export function bestsFromLog(log: LogLike): ExerciseBest[] {
  const bests = new Map<string, ExerciseBest>();

  for (const series of log.exercises ?? []) {
    const exerciseId = series.exerciseId;
    if (!exerciseId) continue;
    const type = recordTypeFor(series.exercise?.type);

    for (const set of series.sets ?? []) {
      if (!set.completed) continue;
      const value =
        type === 'max_weight' ? (set.weight ?? 0) : type === 'max_reps' ? (set.reps ?? 0) : (set.duration ?? 0);
      if (value <= 0) continue;
      // Rekord ciężaru wymaga choć jednego powtórzenia.
      if (type === 'max_weight' && (set.reps ?? 0) <= 0) continue;

      const current = bests.get(exerciseId);
      if (!current || value > current.value) {
        bests.set(exerciseId, {
          exerciseId,
          exerciseName: series.exercise?.name ?? 'Ćwiczenie',
          type,
          value,
          reps: type === 'max_weight' ? (set.reps ?? undefined) : undefined,
        });
      }
    }
  }

  return [...bests.values()];
}

/**
 * Rekord to wynik lepszy od dotychczasowego najlepszego. Ćwiczenie robione
 * pierwszy raz tylko ustala punkt odniesienia — inaczej pierwszy trening
 * dawałby „rekord” w każdym ćwiczeniu.
 */
export function findNewRecords(current: ExerciseBest[], priorBests: Map<string, number>): ExerciseBest[] {
  return current.filter(best => {
    const prior = priorBests.get(best.exerciseId);
    return prior !== undefined && best.value > prior;
  });
}

type LogWithId = LogLike & { _id: Types.ObjectId | string; endTime?: Date | string | null };

/** Wykrywa i zapisuje rekordy życiowe pobite w podanym treningu. */
export async function detectPersonalRecords(userId: string, log: LogWithId): Promise<ExerciseBest[]> {
  await connectToDatabase();

  const current = bestsFromLog(log);
  if (current.length === 0) return [];

  const exerciseIds = current.map(b => b.exerciseId);
  const previousLogs = await WorkoutLog.find({
    athleteId: userId,
    status: 'completed',
    _id: { $ne: log._id },
    'exercises.exerciseId': { $in: exerciseIds },
  })
    .select(
      'exercises.exerciseId exercises.exercise.type exercises.exercise.name exercises.sets.weight exercises.sets.reps exercises.sets.duration exercises.sets.completed'
    )
    .lean();

  const priorBests = new Map<string, number>();
  for (const previous of previousLogs) {
    for (const best of bestsFromLog(previous as unknown as LogLike)) {
      const known = priorBests.get(best.exerciseId);
      if (known === undefined || best.value > known) priorBests.set(best.exerciseId, best.value);
    }
  }

  const records = findNewRecords(current, priorBests);
  if (records.length === 0) return [];

  const achievedAt = log.endTime ? new Date(log.endTime) : new Date();
  await PersonalRecord.insertMany(
    records.map(record => ({
      athleteId: userId,
      exerciseId: record.exerciseId,
      exerciseName: record.exerciseName,
      type: record.type,
      value: record.value,
      reps: record.reps,
      achievedAt,
      workoutLogId: String(log._id),
    }))
  );

  return records;
}

/** Najlepszy ciężar użytkownika w danym ćwiczeniu — dla celów typu „wyciśnij X kg”. */
export async function getExerciseBestWeight(userId: string, exerciseId: string): Promise<number> {
  await connectToDatabase();

  const rows = await WorkoutLog.aggregate<{ _id: null; best: number }>([
    { $match: { athleteId: userId, status: 'completed', 'exercises.exerciseId': exerciseId } },
    { $unwind: '$exercises' },
    { $match: { 'exercises.exerciseId': exerciseId } },
    { $unwind: '$exercises.sets' },
    { $match: { 'exercises.sets.completed': true, 'exercises.sets.reps': { $gt: 0 } } },
    { $group: { _id: null, best: { $max: '$exercises.sets.weight' } } },
  ]);

  return rows[0]?.best ?? 0;
}
