/**
 * Dosiewa zestawy treningowe przygotowujące do biegów na 5 km, 10 km,
 * półmaraton i maraton do ISTNIEJĄCEJ bazy danych.
 *
 * W przeciwieństwie do scripts/seed.ts ten skrypt niczego nie usuwa - dokłada
 * brakujące ćwiczenia biegowe i szablony treningów, a istniejące (dopasowane
 * po nazwie) aktualizuje. Można go uruchamiać wielokrotnie.
 *
 * Użycie:
 *   npm run db:seed:running -- --dry-run   (tylko podgląd zmian)
 *   npm run db:seed:running
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

import { MuscleGroup } from '../src/models/MuscleGroup';
import { Exercise } from '../src/models/Exercise';
import { Workout } from '../src/models/Workout';
import { MuscleGroupName } from '../src/models/types/enums';
import { buildRunningExercises, buildRunningWorkouts } from './data/running-program';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DRY_RUN = process.argv.includes('--dry-run');

let MONGO_DB_URI = process.env.MONGO_DB_URI;

if (!MONGO_DB_URI || MONGO_DB_URI.includes('<db_password>')) {
  console.log('⚠️ Brak poprawnego MONGO_DB_URI w .env - używam lokalnej bazy.');
  MONGO_DB_URI = 'mongodb://localhost:27017/kluska-monolith';
}

/** Zbiera nazwy wszystkich ćwiczeń użytych w zestawach biegowych. */
const collectRequiredExerciseNames = (): string[] => {
  const names = new Set<string>();
  for (const workout of buildRunningWorkouts((name: string) => name)) {
    for (const series of workout.exerciseSeries) {
      names.add(series.exercise);
    }
  }
  return Array.from(names);
};

async function seedRunning() {
  console.log(`🏃 Dosiewanie zestawów biegowych${DRY_RUN ? ' (DRY RUN - bez zapisu)' : ''}...`);

  await mongoose.connect(MONGO_DB_URI!);
  console.log('✅ Połączono z bazą danych MongoDB.');

  try {
    // 1. Grupy mięśniowe - używamy istniejących, nie tworzymy nowych.
    const muscleGroups = await MuscleGroup.find({}).lean();
    const getMg = (name: MuscleGroupName) => {
      const found = muscleGroups.find((mg) => mg.name === name);
      return found ? { name: found.name, imageUrl: found.imageUrl } : { name };
    };

    // 2. Ćwiczenia biegowe - upsert po nazwie.
    const runningExercises = buildRunningExercises(getMg);
    let created = 0;
    let updated = 0;

    for (const exercise of runningExercises) {
      const payload = {
        ...exercise,
        ownerId: 'public',
        muscleGroup: exercise.mainMuscleGroups[0]?.name,
        imageHint: exercise.name.toLowerCase(),
      };

      const existing = await Exercise.findOne({ name: exercise.name }).lean();

      if (DRY_RUN) {
        console.log(`   ${existing ? '↻' : '+'} ${exercise.name}`);
      } else {
        await Exercise.updateOne({ name: exercise.name }, { $set: payload }, { upsert: true });
      }

      if (existing) updated++;
      else created++;
    }
    console.log(`✅ Ćwiczenia biegowe: ${created} nowych, ${updated} zaktualizowanych.`);

    // 3. Sprawdzenie, czy wszystkie ćwiczenia użyte w zestawach są w bazie.
    const requiredNames = collectRequiredExerciseNames();
    const exerciseDocs = await Exercise.find({ name: { $in: requiredNames } });
    const byName = new Map(exerciseDocs.map((doc) => [doc.name, doc]));

    // W trybie dry run ćwiczeń biegowych jeszcze nie ma w bazie - to nie brak.
    const plannedNames = new Set(runningExercises.map((ex) => ex.name));
    const missing = requiredNames.filter(
      (name) => !byName.has(name) && !(DRY_RUN && plannedNames.has(name))
    );
    if (missing.length > 0) {
      throw new Error(
        `Brak w bazie ćwiczeń wymaganych przez zestawy biegowe:\n  - ${missing.join('\n  - ')}\n` +
          'Uruchom najpierw pełny seed (npm run db:seed) albo dodaj te ćwiczenia ręcznie.'
      );
    }

    // 4. Szablony treningów - upsert po nazwie w ramach treningów publicznych.
    const getEx = (name: string) => {
      const doc = byName.get(name);
      if (doc) {
        // Zapisujemy pełny obiekt ćwiczenia wraz z polem id, którego oczekuje UI.
        return { ...doc.toObject(), id: doc._id.toString() };
      }
      if (DRY_RUN && plannedNames.has(name)) {
        return { name };
      }
      throw new Error(`Nie znaleziono ćwiczenia: ${name}`);
    };

    const workouts = buildRunningWorkouts(getEx);
    let workoutsCreated = 0;
    let workoutsUpdated = 0;

    for (const workout of workouts) {
      const existing = await Workout.findOne({ name: workout.name, ownerId: 'public' }).lean();

      if (DRY_RUN) {
        console.log(`   ${existing ? '↻' : '+'} ${workout.name} (${workout.exerciseSeries.length} ćwiczeń)`);
      } else {
        await Workout.updateOne(
          { name: workout.name, ownerId: 'public' },
          { $set: workout },
          { upsert: true }
        );
      }

      if (existing) workoutsUpdated++;
      else workoutsCreated++;
    }
    console.log(`✅ Szablony treningów: ${workoutsCreated} nowych, ${workoutsUpdated} zaktualizowanych.`);

    if (DRY_RUN) {
      console.log('ℹ️ DRY RUN - nic nie zostało zapisane. Uruchom bez --dry-run, aby zapisać.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Rozłączono z bazą danych.');
  }
}

seedRunning().catch((error) => {
  console.error('❌ Błąd podczas dosiewania zestawów biegowych:', error);
  process.exit(1);
});
