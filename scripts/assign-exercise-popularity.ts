import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

/**
 * Nadaje każdemu ćwiczeniu `popularity` (1–100) — po nim, malejąco, sortuje
 * biblioteka ćwiczeń i wyszukiwarka w aplikacji.
 *
 * - Ok. 170 klasyków (wyciskanie, przysiad, martwy ciąg, podciąganie…) ma ocenę
 *   nadaną ręcznie, po angielskiej nazwie źródłowej (`original_name`): 70–100.
 * - Reszta dostaje ocenę z heurystyki: sprzęt, kategoria, wzorzec ruchu
 *   i "egzotyczność" nazwy (długość, warianty "v. 2", kombinacje "with/and/to"): 1–69.
 *
 *   npx tsx scripts/assign-exercise-popularity.ts          # podgląd, bez zapisu
 *   npx tsx scripts/assign-exercise-popularity.ts --apply  # zapis do bazy
 *   npx tsx scripts/assign-exercise-popularity.ts --top 300
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const APPLY = process.argv.includes('--apply');
const topIndex = process.argv.indexOf('--top');
const TOP = topIndex > -1 ? Number(process.argv[topIndex + 1]) || 150 : 150;

/** Ręczne oceny klasyków (klucz: `original_name`). */
const CURATED: Record<string, number> = {
  // Wielki trójbój i najczęstsze ruchy na siłowni
  'barbell bench press': 100,
  'barbell full squat': 99,
  'barbell deadlift': 98,
  'pull-up': 97,
  'push-up': 96,
  'cable wide grip lat pulldown': 95,
  'dumbbell bench press': 94,
  'dumbbell biceps curl': 94,
  'cable seated row': 93,
  'barbell bent over row': 93,
  'dumbbell lateral raise': 93,
  'barbell incline bench press': 92,
  'dumbbell incline bench press': 92,
  'sled 45° leg press': 92,
  'barbell romanian deadlift': 91,
  'barbell hip thrust': 91,
  'front plank': 91,
  'dumbbell seated shoulder press': 90,
  'barbell standing military press': 90,
  'cable pushdown (with rope attachment)': 90,
  'lever leg extension': 90,
  'dumbbell hammer curl': 90,
  'barbell curl': 90,
  'cable pulldown': 89,
  'lever lying leg curl': 89,
  'cable triceps pushdown (v-bar)': 89,
  'dumbbell one arm bent over row': 89,
  'lever seated leg press': 88,
  'lever seated leg curl': 88,
  'chin-up': 88,
  'chest dip': 88,
  'triceps dip': 87,
  'dumbbell lunge': 87,
  'dumbbell bulgarian split squat': 87,
  'dumbbell goblet squat': 87,
  'crunch floor': 87,
  'dumbbell romanian deadlift': 86,
  'barbell front squat': 86,
  'walking lunge': 86,
  'lever pec deck fly': 86,
  'run on treadmill': 86,
  'barbell sumo deadlift': 85,
  'ez barbell curl': 85,
  'dumbbell fly': 85,
  'cable standing crossover': 85,
  'sled hack squat': 85,
  'run': 76,
  'squat': 85,
  'dumbbell shrug': 84,
  'standing calf raise': 84,
  'cable standing face pull (with rope)': 84,
  'cable lateral raise': 84,
  'side plank': 84,
  'hanging leg raise': 84,
  'kettlebell swing': 84,
  'hyperextension': 84,
  'barbell lying triceps extension skull crusher': 84,
  'barbell close-grip bench press': 84,
  'barbell preacher curl': 84,
  'lunge': 84,
  'burpee': 83,
  'bench dip on floor': 83,
  'lever hack squat': 83,
  'barbell shrug': 82,
  'lever seated calf raise': 82,
  'cable standing face pull': 82,
  'lying leg raise': 82,
  'russian twist': 82,
  'bicycle crunch': 82,
  'mountain climber': 82,
  'jump rope': 82,
  'air squat': 82,
  'barbell lunge': 82,
  'barbell glute bridge': 82,
  'cable kneeling crunch': 82,
  'cable curl': 82,
  'dumbbell concentration curl': 82,
  'cable overhead triceps extension (rope attachment)': 82,
  'lever seated reverse fly': 82,
  'dumbbell arnold press': 82,
  'lever seated row': 82,
  'lever t bar row': 82,
  'lever shoulder press': 82,
  'lever seated hip abduction': 82,
  'trap bar deadlift': 82,
  'kettlebell goblet squat': 82,
  'dumbbell rear delt fly': 81,
  'dumbbell reverse fly': 80,
  'jumping jack': 80,
  'walking': 80,
  'walking on treadmill': 80,
  'walking on incline treadmill': 80,
  'rowing (with rowing machine)': 80,
  'farmers walk': 80,
  '45 degrees back extension': 80,
  'smith squat': 80,
  'smith bench press': 80,
  'inverted row': 80,
  'dead bug': 80,
  'sit up': 80,
  'dumbbell kickback': 80,
  'dumbbell seated triceps extension': 80,
  'cable seated wide-grip row': 80,
  'cable straight arm pulldown': 80,
  'diamond push-up': 80,
  'incline push-up': 80,
  'assisted pull-up': 80,
  'lever seated hip adduction': 80,
  'cable kickback': 78,
  'reverse crunch': 80,
  'dumbbell step-up': 80,
  'dumbbell incline fly': 80,
  'dumbbell standing overhead press': 80,
  'barbell seated overhead press': 80,
  'cable middle fly': 80,
  'stationary bike walk': 80,
  'dumbbell preacher curl': 79,
  'lever seated fly': 79,
  'dumbbell lying leg curl': 78,
  'dumbbell glute bridge': 78,
  'bird dog': 78,
  'decline push-up': 78,
  'jump squat': 78,
  'jump box': 78,
  'dumbbell pullover': 78,
  'smith incline bench press': 78,
  'barbell decline bench press': 78,
  'barbell full squat (back pov)': 78,
  'walk elliptical cross trainer': 78,
  'barbell good morning': 76,
  'superman': 76,
  'barbell upright row': 76,
  'close-grip push-up': 76,
  'lever assisted chin-up': 76,
  'barbell thruster': 76,
  'dumbbell thruster': 76,
  'power clean': 76,
  'barbell rack pull': 76,
  'dumbbell deadlift': 76,
  'dumbbell standing calf raise': 76,
  'cable donkey kickback': 76,
  'nordic hamstring curl': 75,
  'handstand push-up': 74,
  'hanging toes to bar': 74,
  'kettlebell deadlift': 74,
  'sit (wall)': 74,
  'high knee run': 74,
  'cable hip abduction (toe out)': 72,
  'barbell clean and jerk': 72,
  'barbell snatch': 72,
  'dumbbell renegade row': 72,
  'dumbbell upright row': 72,
  'band pull apart': 72,
  'walking on stepmill': 72,
  'ski ergometer': 72,
  'muscle-up (on vertical bar)': 70,
  'cable horizontal pallof press': 70,
  'kneeling hip flexor stretch': 70,
  'downward facing dog': 70,
  'barbell wrist curl': 70,
  'sissy squat': 70,
  'l-sit on floor': 68,
  'quadriceps stretch': 68,
  // Uzupełnienia: maszyny i warianty, po które ludzie często sięgają
  'lever chest press': 88,
  'cable hammer curl': 80,
  'dumbbell incline curl': 80,
  'lever seated crunch': 78,
  'cable seated crunch': 76,
  'dumbbell hip thrust': 78,
  'barbell squat': 78,
  'dumbbell squat': 74,
  'dumbbell front squat': 72,
  'dumbbell sumo squat': 74,
  'sumo squat': 74,
  'barbell split squat': 74,
  'split squat': 74,
  'barbell box squat': 70,
  'barbell hack squat': 68,
  'side lunge': 74,
  'dumbbell side lunge': 72,
  'cossack squats': 66,
  'step up': 74,
  'flutter kicks': 76,
  'alternate heel touchers': 70,
  'bear crawl': 70,
  'battling ropes': 76,
  'wall ball': 72,
  'push press': 72,
  'landmine press': 72,
  'dumbbell push press': 70,
  'barbell pullover': 72,
  'dumbbell spider curl': 72,
  'barbell pendlay row': 76,
  'dumbbell chest supported row': 78,
  'dumbbell incline row': 74,
  'cable low seated row': 80,
  'cable rope seated row': 76,
  'cable upright row': 70,
  'band assisted dip': 70,
  'cable kneeling glute kickback': 76,
  'hip abduction': 70,
  'band hip abduction': 72,
  'lever seated calf press': 74,
  'sled calf press on leg press': 76,
  'glute ham raise v. 2': 66,
  'sprint': 74,
};

const EQUIPMENT_SCORE: Record<string, number> = {
  sztanga: 10,
  hantle: 10,
  wyciąg: 8,
  'maszyna dźwigniowa': 8,
  'maszyna Smitha': 5,
  'sztanga łamana': 5,
  'masa ciała': 4,
  orbitrek: 5,
  'rower stacjonarny': 5,
  stepmill: 3,
  'ergometr narciarski': 3,
  kettlebell: 2,
  'sztanga trap': 2,
  'sztanga olimpijska': 2,
  'z obciążeniem': 0,
  landmine: 0,
  'z odciążeniem': -2,
  'guma oporowa': -4,
  'piłka lekarska': -4,
  'taśmy TRX': -6,
  'piłka stabilizacyjna': -6,
};
const OTHER_EQUIPMENT = -8;

const CATEGORY_SCORE: Record<string, number> = {
  siłowe: 8,
  kalistenika: 4,
  cardio: 4,
  plyometria: 0,
  'podnoszenie olimpijskie': -2,
  izometria: -4,
  mobilność: -6,
  rozciąganie: -6,
  joga: -10,
  pilates: -10,
  rehabilitacja: -10,
  'sporty walki': -10,
};

/** Wzorce ruchu, które ludzie faktycznie wpisują — liczy się najlepiej pasujący. */
const PATTERN_SCORE: [RegExp, number][] = [
  [/bench press|deadlift|\bsquat\b|pull-?up|chin-?up|push-?up|pulldown|leg press|hip thrust/, 12],
  [/\brow\b|\bcurl\b|leg extension|\bdips?\b|lunge|lateral raise|shoulder press|military press|overhead press/, 11],
  [/calf raise|crunch|plank|\bfly\b|pushdown|face pull|shrug|triceps extension|skull ?crusher|glute bridge|kickback|step-up|leg raise/, 9],
  [/\bpress\b|\braise\b|\bextension\b|swing|burpee|thruster|clean|snatch/, 5],
];

/** Słowa typowe dla rzadkich, niszowych wariantów. */
const NICHE = /\b(svend|jm|zottman|tate|larsen|spoto|pin|pause|deficit|isometric|hold|negative|korean|impossible|form check|pov|male|female|towel|bottle|chair|bed|table|sheet|wall)\b/g;

interface ExerciseDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  original_name?: string;
  ownerId?: string;
  popularity?: number;
  setup?: { group: string; value: string }[];
}

function setupValue(doc: ExerciseDoc, group: string): string | undefined {
  return doc.setup?.find((item) => item.group === group)?.value;
}

function heuristicScore(doc: ExerciseDoc): number {
  const original = (doc.original_name || doc.name).toLowerCase().trim();
  let score = 30;

  const equipment = setupValue(doc, 'Sprzęt');
  if (equipment) score += EQUIPMENT_SCORE[equipment] ?? OTHER_EQUIPMENT;

  const category = setupValue(doc, 'Kategoria');
  if (category) score += CATEGORY_SCORE[category] ?? 0;

  score += PATTERN_SCORE.find(([pattern]) => pattern.test(original))?.[1] ?? 0;

  // Im dłuższa nazwa, tym bardziej szczegółowy (i rzadszy) wariant.
  const words = original.replace(/\(.*?\)/g, ' ').split(/\s+/).filter(Boolean).length;
  score -= Math.min(18, Math.max(0, words - 3) * 3);
  if (/\bv\. ?\d|version/.test(original)) score -= 8;
  if (/\(/.test(original)) score -= 4;
  if (/\b(with|and|to)\b/.test(original)) score -= 6;
  if (/\b(one|single) (arm|leg)\b|\balternat(e|ing)\b|\bunilateral\b/.test(original)) score -= 3;
  score -= (original.match(NICHE)?.length ?? 0) * 4;

  return Math.max(1, Math.min(69, Math.round(score)));
}

export function popularityFor(doc: ExerciseDoc): number {
  const original = (doc.original_name || '').toLowerCase().trim();
  return CURATED[original] ?? heuristicScore(doc);
}

async function main() {
  const uri = process.env.MONGO_DB_URI;
  if (!uri) throw new Error('Brak MONGO_DB_URI w .env');
  await mongoose.connect(uri);
  const collection = mongoose.connection.db!.collection<ExerciseDoc>('exercises');

  const docs = await collection
    .find({}, { projection: { name: 1, original_name: 1, ownerId: 1, popularity: 1, setup: 1 } })
    .toArray();

  const known = new Set(docs.map((doc) => (doc.original_name || '').toLowerCase().trim()));
  const missing = Object.keys(CURATED).filter((name) => !known.has(name));
  if (missing.length) console.warn(`Ręcznie ocenione, ale brak w bazie (${missing.length}):`, missing);

  const scored = docs.map((doc) => ({ doc, popularity: popularityFor(doc) }));
  scored.sort((a, b) => b.popularity - a.popularity || a.doc.name.localeCompare(b.doc.name, 'pl'));

  console.log(`\nTop ${TOP} z ${docs.length}:`);
  for (const { doc, popularity } of scored.slice(0, TOP)) {
    console.log(`${String(popularity).padStart(3)}  ${doc.name}  —  ${doc.original_name ?? ''}`);
  }

  const buckets = new Map<string, number>();
  for (const { popularity } of scored) {
    const bucket = `${Math.floor((popularity - 1) / 10) * 10 + 1}-${Math.floor((popularity - 1) / 10) * 10 + 10}`;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  console.log('\nRozkład:', Object.fromEntries([...buckets].sort((a, b) => parseInt(a[0]) - parseInt(b[0]))));

  const changes = scored.filter(({ doc, popularity }) => doc.popularity !== popularity);
  console.log(`\nDo zmiany: ${changes.length} z ${docs.length}`);

  if (!APPLY) {
    console.log('Podgląd — nic nie zapisano. Uruchom z --apply, aby zapisać.');
  } else if (changes.length) {
    const BATCH = 500;
    for (let i = 0; i < changes.length; i += BATCH) {
      const ops = changes.slice(i, i + BATCH).map(({ doc, popularity }) => ({
        updateOne: { filter: { _id: doc._id }, update: { $set: { popularity } } },
      }));
      const result = await collection.bulkWrite(ops, { ordered: false });
      console.log(`Zapisano ${Math.min(i + BATCH, changes.length)}/${changes.length} (zmienione: ${result.modifiedCount})`);
    }
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
