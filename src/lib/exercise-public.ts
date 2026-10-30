import { Exercise, WorkoutLog } from '@/models';

/** Publiczne ćwiczenia to wyłącznie biblioteka (ownerId = 'public'). */
const PUBLIC_OWNER_ID = 'public';

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export interface PublicExercise {
  id: string;
  name: string;
  type: 'weight' | 'duration' | 'reps';
  mainMuscleGroups: { name: string }[];
  secondaryMuscleGroups: { name: string }[];
  setup: { group: string; value: string }[];
  instructions?: string;
  description?: string;
  mediaUrl?: string;
  image?: string;
}

export interface PublicExerciseStats {
  /** Suma waga × powtórzenia z ukończonych serii wszystkich użytkowników. */
  totalKg: number;
  totalSets: number;
  totalReps: number;
  /** Liczba unikalnych użytkowników, którzy wykonali to ćwiczenie. */
  lifters: number;
  /** Sale posortowane malejąco po tonażu (bez treningów poza salą). */
  topGyms: { name: string; totalKg: number; lifters: number }[];
}

export function isValidExerciseId(id: string): boolean {
  return OBJECT_ID_RE.test(id);
}

/** Zwraca ćwiczenie tylko wtedy, gdy należy do publicznej biblioteki. */
export async function getPublicExercise(id: string): Promise<PublicExercise | null> {
  if (!isValidExerciseId(id)) return null;

  const doc = await Exercise.findOne({ _id: id, ownerId: PUBLIC_OWNER_ID }).lean();
  if (!doc) return null;

  return {
    id: String(doc._id),
    name: doc.name,
    type: doc.type,
    mainMuscleGroups: (doc.mainMuscleGroups ?? []).map((mg) => ({ name: mg.name })),
    secondaryMuscleGroups: (doc.secondaryMuscleGroups ?? []).map((mg) => ({ name: mg.name })),
    setup: (doc.setup ?? []).map((s) => ({ group: s.group, value: s.value })),
    instructions: doc.instructions,
    description: doc.description,
    mediaUrl: doc.mediaUrl,
    image: doc.image,
  };
}

interface StatsGroupRow {
  _id: string | null;
  totalKg: number;
  totalSets: number;
  totalReps: number;
  athleteIds: string[];
}

/**
 * Agreguje ukończone serie danego ćwiczenia ze wszystkich treningów.
 * Grupowanie po nazwie sali pozwala policzyć zarówno sumy, jak i ranking sal.
 */
export async function getExerciseStats(exerciseId: string): Promise<PublicExerciseStats> {
  const rows = await WorkoutLog.aggregate<StatsGroupRow>([
    { $match: { status: 'completed', 'exercises.exerciseId': exerciseId } },
    { $unwind: '$exercises' },
    { $match: { 'exercises.exerciseId': exerciseId } },
    { $unwind: '$exercises.sets' },
    { $match: { 'exercises.sets.completed': true } },
    {
      $group: {
        _id: '$gymName',
        totalKg: { $sum: { $multiply: ['$exercises.sets.weight', '$exercises.sets.reps'] } },
        totalSets: { $sum: 1 },
        totalReps: { $sum: '$exercises.sets.reps' },
        athleteIds: { $addToSet: '$athleteId' },
      },
    },
  ]);

  const allAthletes = new Set<string>();
  let totalKg = 0;
  let totalSets = 0;
  let totalReps = 0;
  const topGyms: PublicExerciseStats['topGyms'] = [];

  for (const row of rows) {
    totalKg += row.totalKg;
    totalSets += row.totalSets;
    totalReps += row.totalReps;
    row.athleteIds.forEach((id) => allAthletes.add(id));

    if (row._id) {
      topGyms.push({ name: row._id, totalKg: row.totalKg, lifters: row.athleteIds.length });
    }
  }

  topGyms.sort((a, b) => b.totalKg - a.totalKg);

  return {
    totalKg: Math.round(totalKg),
    totalSets,
    totalReps,
    lifters: allAthletes.size,
    topGyms: topGyms.slice(0, 3),
  };
}
