import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

/**
 * Łączy ćwiczenia zapisane w logach treningów (workoutLogs.exercises) z kolekcją
 * `exercises`. Dla każdego wpisu:
 *   - jeśli exerciseId wskazuje istniejące ćwiczenie, snapshot jest odświeżany
 *     z aktualnych danych ćwiczenia;
 *   - jeśli exerciseId jest pusty lub nieprawidłowy, a w bazie jest DOKŁADNIE
 *     jedno ćwiczenie o tej samej nazwie (snapshot.name), wpis dostaje jego id;
 *   - w pozostałych przypadkach wpis jest raportowany i nie jest zmieniany.
 *
 *   npx tsx scripts/relink-workout-logs.ts          # dry run (domyślnie, nic nie zapisuje)
 *   npx tsx scripts/relink-workout-logs.ts --apply  # zapis do bazy
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const APPLY = process.argv.includes('--apply');

type Snapshot = Record<string, any> & { _id?: unknown; name?: string };

function snapshotOf(exercise: Record<string, any>) {
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

async function main() {
  const uri = process.env.MONGO_DB_URI || process.env.DATABASE_URL;
  if (!uri) throw new Error('Brak MONGO_DB_URI w .env');

  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  const exercises = await db.collection('exercises').find({}).toArray();
  const byId = new Map(exercises.map(ex => [String(ex._id), ex]));
  const byName = new Map<string, Record<string, any>[]>();
  for (const ex of exercises) {
    const list = byName.get(ex.name) ?? [];
    list.push(ex);
    byName.set(ex.name, list);
  }

  const logs = await db.collection('workoutLogs').find({}).toArray();
  const stats = { logs: logs.length, entries: 0, relinked: 0, refreshed: 0, unresolved: 0 };
  const unresolved: string[] = [];
  const updates: { _id: any; exercises: any[] }[] = [];

  for (const log of logs) {
    let changed = false;
    const exercises: any[] = (log.exercises ?? []).map((series: any) => {
      stats.entries++;
      const snapshot: Snapshot = series.exercise ?? {};
      const currentId = String(series.exerciseId ?? snapshot._id ?? '');
      let target: Record<string, any> | undefined = byId.get(currentId);

      if (!target && snapshot.name) {
        const sameName = byName.get(snapshot.name) ?? [];
        if (sameName.length === 1) target = sameName[0];
      }

      if (!target) {
        stats.unresolved++;
        unresolved.push(`log ${log._id} "${snapshot.name ?? '?'}" (exerciseId: ${currentId || '—'})`);
        return series;
      }

      const newId = String(target._id);
      const fresh = snapshotOf(target);
      const idChanged = series.exerciseId !== newId;
      const snapshotChanged = JSON.stringify(snapshot) !== JSON.stringify(fresh);
      if (!idChanged && !snapshotChanged) return series;

      changed = true;
      if (idChanged) stats.relinked++;
      if (snapshotChanged) stats.refreshed++;
      return { ...series, exerciseId: newId, exercise: fresh };
    });

    if (changed) updates.push({ _id: log._id, exercises });
  }

  console.log(JSON.stringify(stats, null, 2));
  if (unresolved.length) {
    console.log(`\nNierozwiązane wpisy (${unresolved.length}) — wymagają ręcznej decyzji:`);
    for (const line of unresolved) console.log(`  - ${line}`);
  }

  if (!APPLY) {
    console.log(`\nDry run: ${updates.length} logów do zmiany. Uruchom z --apply, aby zapisać.`);
  } else {
    for (const u of updates) {
      await db.collection('workoutLogs').updateOne({ _id: u._id }, { $set: { exercises: u.exercises } });
    }
    console.log(`\nZapisano zmiany w ${updates.length} logach.`);
  }

  await mongoose.disconnect();
}

main().catch(async err => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
