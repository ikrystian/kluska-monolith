import { useCallback, useMemo, useState } from 'react';
import { useCollection } from '@/lib/db-hooks';
import type { Exercise } from '@/lib/types';

/** Only real document ids go to the server: a temporary or empty id would fail the whole query. */
const OBJECT_ID = /^[a-f0-9]{24}$/i;

/**
 * Exercises this session has already seen in full: fetched here, picked in the
 * library sheet, or carried inside a workout (templates and logs embed a copy
 * of each exercise). They stand in while a fetch is under way — and when it
 * cannot succeed at all, e.g. offline — so a workout never shows, or saves, an
 * "unknown exercise" for something it already holds.
 */
const seen = new Map<string, Exercise>();

/** Records exercise copies the caller holds, e.g. the ones embedded in a workout being opened. */
export function noteExercises(list: Array<Partial<Exercise> | null | undefined>): void {
  for (const exercise of list) {
    const id = exercise?.id ?? (exercise as { _id?: unknown } | null | undefined)?._id;
    if (!exercise || !id || !exercise.name || seen.has(String(id))) continue;
    seen.set(String(id), { ...exercise, id: String(id) } as Exercise);
  }
}

export interface ExercisesByIds {
  /** Details of the requested exercises; `null` until the first answer arrives. */
  exercises: Exercise[] | null;
  isLoading: boolean;
  /**
   * Hands over an exercise the caller already holds (e.g. the one just picked
   * in the library sheet), so it is available at once instead of after a fetch.
   */
  remember: (exercise: Exercise) => void;
}

/**
 * Details of the exercises a workout refers to, fetched by id.
 *
 * Screens that edit a workout need the name, type and media of the handful of
 * exercises in it — not the library. Loading the whole library for that meant
 * a 12 MB download (5 600 documents) every time a workout was opened, and an
 * "unknown exercise" for as long as it took to arrive.
 */
export function useExercisesByIds(ids: Array<string | null | undefined>): ExercisesByIds {
  // Sorted and de-duplicated, so one set of exercises is one cache entry
  // whatever order the workout lists them in.
  const idsKey = Array.from(new Set(ids.filter((id): id is string => !!id && OBJECT_ID.test(id))))
    .sort()
    .join(',');
  const query = useMemo(() => (idsKey ? { _id: { $in: idsKey.split(',') } } : undefined), [idsKey]);

  const { data, isLoading } = useCollection<Exercise>(idsKey ? 'exercises' : null, query);

  const [remembered, setRemembered] = useState<Record<string, Exercise>>({});
  const remember = useCallback((exercise: Exercise) => {
    noteExercises([exercise]);
    setRemembered((previous) => (previous[exercise.id] ? previous : { ...previous, [exercise.id]: exercise }));
  }, []);

  const exercises = useMemo(() => {
    if (data) noteExercises(data);
    // What the server sent is the fresher copy; the rest comes from what is already held.
    const byId = new Map<string, Exercise>();
    for (const id of idsKey ? idsKey.split(',') : []) {
      const held = seen.get(id);
      if (held) byId.set(id, held);
    }
    for (const exercise of Object.values(remembered)) byId.set(exercise.id, exercise);
    for (const exercise of data ?? []) byId.set(exercise.id, exercise);
    // Still waiting for the first answer and holding nothing: "loading", not "empty".
    if (!data && idsKey && byId.size === 0) return null;
    return Array.from(byId.values());
  }, [data, remembered, idsKey]);

  return { exercises, isLoading: Boolean(idsKey) && isLoading, remember };
}
