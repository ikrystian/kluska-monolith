import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

import { MuscleGroupName } from '../src/models/types/enums';

/**
 * Ujednolica nazwy partii mięśniowych (mainMuscleGroups, secondaryMuscleGroups,
 * legacy muscleGroup) oraz wartości grupy setup "Część ciała" — wszystko po polsku,
 * wielką literą, z tymi samymi nazwami tam, gdzie część ciała pokrywa się z partią.
 *
 * Obejmuje ćwiczenia oraz ich kopie zapisane w treningach, planach i logach.
 *
 *   npx tsx scripts/migrate-muscle-group-names.ts          # dry run
 *   npx tsx scripts/migrate-muscle-group-names.ts --apply  # zapis do bazy
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const APPLY = process.argv.includes('--apply');
const BODY_PART_GROUP = 'Część ciała';

// Stara wartość -> nowa. Angielskie nazwy z wcześniejszych importów też są mapowane.
const MUSCLE_GROUP_RENAMES: Record<string, MuscleGroupName> = {
  Klata: MuscleGroupName.Chest,
  Chest: MuscleGroupName.Chest,
  Core: MuscleGroupName.Core,
  'Full Body': MuscleGroupName.FullBody,
  'Lower Back': MuscleGroupName.LowerBack,
  Quads: MuscleGroupName.Quads,
  'Rear Delts': MuscleGroupName.RearDelts,
  Shoulders: MuscleGroupName.Shoulders,
  'Anterior Tibialis': MuscleGroupName.AnteriorTibialis,
  Traps: MuscleGroupName.Traps,
  Adductors: MuscleGroupName.Adductors,
  Hips: MuscleGroupName.Hips,
  Abductors: MuscleGroupName.Abductors,
  Back: MuscleGroupName.Back,
  Calves: MuscleGroupName.Calves,
  Forearms: MuscleGroupName.Forearms,
  Glutes: MuscleGroupName.Glutes,
  Hamstrings: MuscleGroupName.Hamstrings,
};

const BODY_PART_RENAMES: Record<string, string> = {
  uda: 'Uda',
  talia: MuscleGroupName.Core,
  plecy: MuscleGroupName.Back,
  barki: MuscleGroupName.Shoulders,
  ramiona: 'Ramiona',
  'klatka piersiowa': MuscleGroupName.Chest,
  'całe ciało': MuscleGroupName.FullBody,
  podudzia: MuscleGroupName.Calves,
  przedramiona: MuscleGroupName.Forearms,
  cardio: 'Cardio',
  szyja: 'Szyja',
};

// Kolekcje, w których zapisane są ćwiczenia (bezpośrednio lub jako kopie).
const COLLECTIONS = ['exercises', 'workouts', 'workoutplans', 'workoutlogs'];

const KNOWN_MUSCLE_GROUPS = new Set<string>(Object.values(MuscleGroupName));
const renamed = new Map<string, number>();
const unknown = new Map<string, number>();

function count(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function renameMuscleGroup(value: string): string {
  const next = MUSCLE_GROUP_RENAMES[value] ?? value;
  if (next !== value) count(renamed, `${value} -> ${next}`);
  else if (!KNOWN_MUSCLE_GROUPS.has(value)) count(unknown, `partia: ${value}`);
  return next;
}

function renameBodyPart(value: string): string {
  const next = BODY_PART_RENAMES[value] ?? value;
  if (next !== value) count(renamed, `${BODY_PART_GROUP}: ${value} -> ${next}`);
  return next;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

/** Podmienia nazwy w miejscu; zwraca true, gdy coś się zmieniło. */
function migrateNode(node: unknown): boolean {
  if (Array.isArray(node)) {
    return node.map(migrateNode).some(Boolean);
  }
  if (!isPlainObject(node)) return false;

  let changed = false;
  for (const [key, value] of Object.entries(node)) {
    if ((key === 'mainMuscleGroups' || key === 'secondaryMuscleGroups') && Array.isArray(value)) {
      for (const mg of value) {
        if (isPlainObject(mg) && typeof mg.name === 'string') {
          const next = renameMuscleGroup(mg.name);
          if (next !== mg.name) {
            mg.name = next;
            changed = true;
          }
        }
      }
    } else if (key === 'muscleGroup' && typeof value === 'string') {
      const next = renameMuscleGroup(value);
      if (next !== value) {
        node[key] = next;
        changed = true;
      }
    } else if (key === 'setup' && Array.isArray(value)) {
      for (const item of value) {
        if (isPlainObject(item) && item.group === BODY_PART_GROUP && typeof item.value === 'string') {
          const next = renameBodyPart(item.value);
          if (next !== item.value) {
            item.value = next;
            changed = true;
          }
        }
      }
    } else if (migrateNode(value)) {
      changed = true;
    }
  }
  return changed;
}

async function migrateCollection(db: mongoose.mongo.Db, name: string) {
  const collection = db.collection(name);
  const ops: mongoose.mongo.AnyBulkWriteOperation[] = [];

  for await (const doc of collection.find({})) {
    const $set: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(doc)) {
      // Opakowanie, żeby pole najwyższego poziomu (np. `muscleGroup`) też dało się podmienić
      const field: Record<string, unknown> = { [key]: value };
      if (key !== '_id' && migrateNode(field)) $set[key] = field[key];
    }
    if (Object.keys($set).length) {
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set } } });
    }
  }

  console.log(`📦 ${name}: ${ops.length} dokumentów do zmiany`);
  if (APPLY && ops.length) {
    const result = await collection.bulkWrite(ops, { ordered: false });
    console.log(`   ✅ zaktualizowano ${result.modifiedCount}`);
  }
}

/** Słownik partii (kolekcja musclegroups) — zmiana pola `name`. */
async function migrateMuscleGroupDictionary(db: mongoose.mongo.Db) {
  const collection = db.collection('musclegroups');
  const ops: mongoose.mongo.AnyBulkWriteOperation[] = [];

  for await (const doc of collection.find({})) {
    if (typeof doc.name !== 'string') continue;
    const next = renameMuscleGroup(doc.name);
    if (next !== doc.name) {
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { name: next } } } });
    }
  }

  console.log(`📦 musclegroups: ${ops.length} dokumentów do zmiany`);
  if (APPLY && ops.length) {
    const result = await collection.bulkWrite(ops, { ordered: false });
    console.log(`   ✅ zaktualizowano ${result.modifiedCount}`);
  }
}

async function main() {
  const uri = process.env.MONGO_DB_URI;
  if (!uri) throw new Error('Brak MONGO_DB_URI w pliku .env');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('Brak połączenia z bazą');

  console.log(APPLY ? '🚀 Tryb zapisu (--apply)' : '🔍 Dry run — bez zapisu (dodaj --apply, aby zapisać)');
  console.log(`🗄️  Baza: ${db.databaseName}\n`);

  for (const name of COLLECTIONS) {
    await migrateCollection(db, name);
  }
  await migrateMuscleGroupDictionary(db);

  console.log('\n🔁 Zmiany wartości:');
  for (const [change, n] of [...renamed].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${change}  ×${n}`);
  }
  if (unknown.size) {
    console.log('\n⚠️  Wartości spoza enuma MuscleGroupName (bez zmian):');
    for (const [value, n] of unknown) console.log(`   ${value}  ×${n}`);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('❌ Migracja nie powiodła się:', error);
  await mongoose.disconnect();
  process.exit(1);
});
