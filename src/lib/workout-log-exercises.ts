import { isValidObjectId } from 'mongoose';
import { Exercise } from '@/models/Exercise';
import { AccessError } from '@/lib/db-access';

/** One entry of `workoutLogs.exercises` as the client sends it. */
export interface WorkoutLogSeriesInput {
  exerciseId?: unknown;
  exercise?: { _id?: unknown; id?: unknown } | null;
  [key: string]: unknown;
}

/** Snapshot of an exercise as stored inside a workout log (mirrors `WorkoutLog`'s `ExerciseSnapshotSchema`). */
export function exerciseSnapshot(exercise: any) {
  return {
    _id: String(exercise._id),
    name: exercise.name,
    mainMuscleGroups: exercise.mainMuscleGroups ?? [],
    secondaryMuscleGroups: exercise.secondaryMuscleGroups ?? [],
    setup: exercise.setup ?? [],
    instructions: exercise.instructions,
    mediaUrl: exercise.mediaUrl,
    muscleGroup: exercise.muscleGroup,
    type: exercise.type,
  };
}

/**
 * Links the exercises of a workout log to the `exercises` collection.
 *
 * Every entry must point at an existing exercise (`exerciseId`). Its embedded
 * `exercise` snapshot is replaced with the exercise's current data, so logs
 * always match the library: the name, muscle groups and type can't drift, and
 * a client that didn't have the library loaded can't store "Unknown Exercise".
 */
export async function linkWorkoutLogExercises<T extends WorkoutLogSeriesInput>(series: T[]): Promise<T[]> {
  const requestedIds = series.map(s => String(s.exerciseId ?? s.exercise?._id ?? s.exercise?.id ?? ''));
  const validIds = [...new Set(requestedIds.filter(id => isValidObjectId(id)))];

  const found = validIds.length
    ? await Exercise.find({ _id: { $in: validIds } }).lean().exec()
    : [];
  const byId = new Map(found.map(ex => [String(ex._id), ex]));

  const unknown = requestedIds.filter(id => !byId.has(id));
  if (unknown.length) {
    throw new AccessError(400, `Unknown exercise(s): ${[...new Set(unknown)].join(', ') || '(missing id)'}`);
  }

  return series.map((s, i) => {
    const exercise = byId.get(requestedIds[i])!;
    return { ...s, exerciseId: String(exercise._id), exercise: exerciseSnapshot(exercise) } as T;
  });
}
