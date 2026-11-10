import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SOURCE_DIR = '/home/krystian/Downloads/drive-download-20261110T124857Z-1-001/+400 Workout Animations - UPDATED VERSION';
const UPLOAD_DIR = path.resolve(process.cwd(), 'upload-data');
const TXT_LOG_PROJECT = path.resolve(process.cwd(), 'przypisane_animacje.txt');
const TXT_LOG_DOWNLOADS = '/home/krystian/Downloads/przypisane_animacje.txt';
const CONCURRENCY = 4;

interface ExerciseDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  original_name?: string;
  muscleGroup?: string;
  setup?: { group: string; value: string; _id?: any }[];
  mainMuscleGroups?: { name: string }[];
  secondaryMuscleGroups?: { name: string }[];
  popularity?: number;
}

interface VisionInfo {
  exercise_name: string;
  exercise_name_pl?: string;
  alternative_names?: string[];
  equipment?: string;
  target_muscle?: string;
  movement?: string;
  stance_or_grip?: string;
}

function logMessage(msg: string) {
  const line = `${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(TXT_LOG_PROJECT, line, 'utf-8');
  try {
    fs.appendFileSync(TXT_LOG_DOWNLOADS, line, 'utf-8');
  } catch {}
}

function normalize(s: string): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .replace(/skullcrusher/g, 'skull crusher')
    .replace(/pushup/g, 'push up')
    .replace(/pullup/g, 'pull up')
    .replace(/chinup/g, 'chin up')
    .replace(/dumbbell/g, 'dumbbell ')
    .replace(/barbell/g, 'barbell ')
    .replace(/kettlebell/g, 'kettlebell ')
    .replace(/deadlift/g, 'deadlift ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function wordOverlapScore(cand: string, target: string): number {
  const cWords = new Set(normalize(cand));
  const tWords = new Set(normalize(target));
  if (cWords.size === 0 || tWords.size === 0) return 0;
  let matchCount = 0;
  for (const w of cWords) {
    if (tWords.has(w)) matchCount++;
  }
  return matchCount / cWords.size;
}

function scoreExercise(ex: ExerciseDoc, info: VisionInfo): number {
  const candidates = [info.exercise_name, info.exercise_name_pl, ...(info.alternative_names || [])]
    .filter(Boolean) as string[];

  const orig = ex.original_name || '';
  const name = ex.name || '';
  const origLower = orig.toLowerCase();
  const nameLower = name.toLowerCase();

  let maxTextScore = 0;

  for (const cand of candidates) {
    const cLower = cand.toLowerCase();
    if (cLower === origLower || cLower === nameLower) {
      maxTextScore = Math.max(maxTextScore, 100);
    } else if (origLower.includes(cLower) || nameLower.includes(cLower)) {
      maxTextScore = Math.max(maxTextScore, 70);
    } else if (cLower.includes(origLower) && origLower.length > 5) {
      maxTextScore = Math.max(maxTextScore, 50);
    } else {
      const origOverlap = wordOverlapScore(cand, orig);
      const nameOverlap = wordOverlapScore(cand, name);
      const bestOverlap = Math.max(origOverlap, nameOverlap);
      if (bestOverlap >= 0.5) {
        maxTextScore = Math.max(maxTextScore, Math.round(bestOverlap * 80));
      }
    }
  }

  if (maxTextScore === 0) return 0;

  let totalScore = maxTextScore;

  // Equipment check
  const equipStr = (ex.setup?.find((s) => s.group === 'Sprzęt')?.value || '').toLowerCase();
  const infoEquip = (info.equipment || '').toLowerCase();

  if (infoEquip) {
    if (
      (infoEquip.includes('dumbbell') && equipStr.includes('hantle')) ||
      (infoEquip.includes('barbell') && equipStr.includes('sztang')) ||
      (infoEquip.includes('kettlebell') && equipStr.includes('kettlebell')) ||
      (infoEquip.includes('cable') && equipStr.includes('wyciąg')) ||
      (infoEquip.includes('machine') && equipStr.includes('maszyn')) ||
      (infoEquip.includes('bodyweight') && (equipStr.includes('masa ciała') || equipStr.includes('brak'))) ||
      (infoEquip.includes('smith') && equipStr.includes('smith'))
    ) {
      totalScore += 25;
    } else if (
      (infoEquip.includes('dumbbell') && equipStr.includes('sztang')) ||
      (infoEquip.includes('barbell') && equipStr.includes('hantle')) ||
      (infoEquip.includes('bodyweight') && equipStr.includes('sztang'))
    ) {
      totalScore -= 40; // Mismatch penalty
    }
  }

  // Position / grip penalty
  const infoStance = (info.stance_or_grip || '').toLowerCase();
  if (infoStance.includes('incline') && !origLower.includes('incline') && !nameLower.includes('skoś')) {
    totalScore -= 30;
  }
  if (infoStance.includes('decline') && !origLower.includes('decline')) {
    totalScore -= 30;
  }
  if (infoStance.includes('sumo') && !origLower.includes('sumo')) {
    totalScore -= 30;
  }

  // Popularity tie-breaker
  const pop = ex.popularity ?? 0;
  totalScore += Math.round(pop / 10);

  return totalScore;
}

function extractFrames(filePath: string, baseId: string): string[] {
  const tmpDir = '/tmp';
  const frame1 = path.join(tmpDir, `f1_${baseId}.jpg`);
  const frame2 = path.join(tmpDir, `f2_${baseId}.jpg`);
  const frames: string[] = [];

  try {
    if (filePath.endsWith('.mp4')) {
      execSync(`ffmpeg -y -ss 00:00:02 -i "${filePath}" -vf "scale=480:-1" -vframes 1 "${frame1}" 2>/dev/null`);
      execSync(`ffmpeg -y -ss 00:00:05 -i "${filePath}" -vf "scale=480:-1" -vframes 1 "${frame2}" 2>/dev/null`);
    } else {
      execSync(`ffmpeg -y -i "${filePath}" -vf "select=eq(n\\,6),scale=480:-1" -vframes 1 "${frame1}" 2>/dev/null`);
      execSync(`ffmpeg -y -i "${filePath}" -vf "select=eq(n\\,16),scale=480:-1" -vframes 1 "${frame2}" 2>/dev/null`);
    }

    if (fs.existsSync(frame1)) frames.push(frame1);
    if (fs.existsSync(frame2)) frames.push(frame2);
  } catch (err) {
    console.error(`Frame extraction error for ${filePath}:`, err);
  }

  return frames;
}

async function callVisionModel(framePaths: string[]): Promise<VisionInfo> {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) throw new Error('Brak OPEN_ROUTER_API_KEY');

  const content: any[] = [
    {
      type: 'text',
      text: `You are an elite fitness trainer, kinesiologist, and exercise database curator.
Analyze these demonstration frames of a workout exercise animation (showing execution and muscular emphasis).
Identify the EXACT exercise being performed.
Return JSON with this schema:
{
  "exercise_name": "Standard English name (e.g. Incline Dumbbell Bench Press)",
  "exercise_name_pl": "Standard Polish name (e.g. Wyciskanie hantli na ławce skośnej dodatniej)",
  "alternative_names": ["alternative English and Polish names"],
  "equipment": "dumbbell / barbell / kettlebell / cable / bodyweight / machine / smith / ez-bar / resistance band",
  "target_muscle": "chest / back / shoulders / biceps / triceps / quads / hamstrings / glutes / abs / calves",
  "movement": "press / fly / curl / extension / row / pulldown / pullup / squat / lunge / deadlift / raise / crunch / plank / dip / shrug",
  "stance_or_grip": "sumo / incline / decline / neutral / pronated / supinated / seated / standing / lying / etc."
}`,
    },
  ];

  for (const p of framePaths) {
    const b64 = fs.readFileSync(p).toString('base64');
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${b64}` },
    });
  }

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content }],
          response_format: { type: 'json_object' },
        }),
      });

      if (res.status === 429) {
        console.warn(`[Rate limit 429] waiting ${attempt * 3}s before retry...`);
        await new Promise((r) => setTimeout(r, attempt * 3000));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenRouter API error ${res.status}: ${text}`);
      }

      const data = await res.json();
      const raw = data.choices[0].message.content;
      return JSON.parse(raw);
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }

  throw new Error('Failed to get vision model response after retries');
}

function md5File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(buf).digest('hex');
}

async function main() {
  console.log('=== Rozpoczynanie przypisywania animacji ćwiczeń ===');
  console.log(`Katalog źródłowy: ${SOURCE_DIR}`);
  console.log(`Katalog docelowy uploadu: ${UPLOAD_DIR}`);
  console.log(`Plik raportu: ${TXT_LOG_PROJECT}`);

  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Katalog źródłowy nie istnieje: ${SOURCE_DIR}`);
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const startHeader = `\n====================================================================================================
RAPORT PRZYPISANYCH ANIMACJI - KLUSKA MONOLITH (admin: http://localhost:3001/admin/exercises)
Rozpoczęto: ${new Date().toISOString()}
====================================================================================================\n`;
  fs.appendFileSync(TXT_LOG_PROJECT, startHeader, 'utf-8');
  try {
    fs.appendFileSync(TXT_LOG_DOWNLOADS, startHeader, 'utf-8');
  } catch {}

  const uri = process.env.MONGO_DB_URI;
  if (!uri) throw new Error('Brak MONGO_DB_URI w .env');
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  const collection = db.collection<ExerciseDoc>('exercises');

  const exercises = await collection
    .find({}, { projection: { name: 1, original_name: 1, setup: 1, popularity: 1, mainMuscleGroups: 1 } })
    .toArray();
  console.log(`Załadowano ${exercises.length} ćwiczeń z bazy danych.`);

  const allFiles = fs
    .readdirSync(SOURCE_DIR)
    .filter((f) => f.endsWith('.mp4') || f.endsWith('.gif'))
    .sort();

  console.log(`Liczba plików do przetworzenia: ${allFiles.length}`);

  // Śledzenie duplikatów i przypisań
  interface UploadedMeta {
    fileName: string;
    exerciseId: string;
    exerciseName: string;
    destUrl: string;
  }
  const hashMap = new Map<string, UploadedMeta>();
  const assignedExerciseIds = new Set<string>();

  let processedCount = 0;
  let assignedCount = 0;
  let duplicateCount = 0;
  let unassignedCount = 0;

  // Kolejka plików
  const queue = [...allFiles];

  async function worker(workerId: number) {
    while (queue.length > 0) {
      const fileName = queue.shift();
      if (!fileName) break;

      const filePath = path.join(SOURCE_DIR, fileName);
      if (!fs.existsSync(filePath)) continue;

      const currentIdx = ++processedCount;
      const fileExt = path.extname(fileName).toLowerCase();
      const hash = md5File(filePath);

      // Sprawdź czy to binarny duplikat
      if (hashMap.has(hash)) {
        const orig = hashMap.get(hash)!;
        duplicateCount++;
        logMessage(
          `[${new Date().toLocaleTimeString()}] [DUPLIKAT] [${currentIdx}/${allFiles.length}] PLIK: "${fileName}"\n` +
          `  -> Identyczny z wcześniej przypisanym plikiem: "${orig.fileName}"\n` +
          `  -> Przypisany do ćwiczenia: "${orig.exerciseName}" (ID: ${orig.exerciseId})\n` +
          `  -> ZASÓB: ${orig.destUrl}\n` +
          `  -> Akcja: Pominięto ponowny upload, plik źródłowy "${fileName}" USUNIĘTO.\n`
        );
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error(`Nie udało się usunąć ${fileName}:`, e);
        }
        continue;
      }

      // Wyodrębnij klatki
      const safeId = `${workerId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const frames = extractFrames(filePath, safeId);

      if (frames.length === 0) {
        unassignedCount++;
        logMessage(
          `[${new Date().toLocaleTimeString()}] [BŁĄD KLATEK] [${currentIdx}/${allFiles.length}] PLIK: "${fileName}" - brak klatek.\n`
        );
        continue;
      }

      try {
        const info = await callVisionModel(frames);

        // Znajdź najlepsze dopasowanie
        const scoredCandidates: { score: number; ex: ExerciseDoc }[] = [];
        for (const ex of exercises) {
          const score = scoreExercise(ex, info);
          if (score >= 45) {
            // Jeśli ćwiczenie było już przypisane w tej sesji, daj lekki rabat, żeby preferować unikalne ćwiczenia
            const alreadyAssignedPenalty = assignedExerciseIds.has(ex._id.toString()) ? 25 : 0;
            scoredCandidates.push({ score: score - alreadyAssignedPenalty, ex });
          }
        }

        scoredCandidates.sort((a, b) => b.score - a.score);
        const best = scoredCandidates[0];

        if (!best || best.score < 45) {
          unassignedCount++;
          logMessage(
            `[${new Date().toLocaleTimeString()}] [NIEPRZYPISANE] [${currentIdx}/${allFiles.length}] PLIK: "${fileName}"\n` +
            `  -> Rozpoznano: "${info.exercise_name}" / "${info.exercise_name_pl}" (${info.equipment || 'brak sprzętu'}, ${info.target_muscle || 'brak mięśnia'})\n` +
            `  -> Najlepszy kandydat: "${best?.ex?.name}" (${best?.ex?.original_name}) - wynik za niski (${best?.score ?? 0} < 45)\n` +
            `  -> Plik źródłowy zachowano do weryfikacji.\n`
          );
        } else {
          // Pomyślne dopasowanie!
          const targetEx = best.ex;
          const exId = targetEx._id;
          const oldAnim = targetEx.setup?.find((s) => s.group === 'Animacja')?.value || '';

          // Kopiuj do upload-data
          const destUuid = crypto.randomUUID();
          const destName = `${destUuid}${fileExt}`;
          const destPath = path.join(UPLOAD_DIR, destName);
          const destUrl = `/upload-data/${destName}`;

          fs.copyFileSync(filePath, destPath);

          // Zaktualizuj bazę danych MongoDB
          const currentSetup = targetEx.setup || [];
          let updatedSetup: any[];
          const existingAnimIdx = currentSetup.findIndex((s) => s.group === 'Animacja');
          if (existingAnimIdx >= 0) {
            updatedSetup = currentSetup.map((s, idx) => (idx === existingAnimIdx ? { ...s, value: destUrl } : s));
          } else {
            updatedSetup = [...currentSetup, { group: 'Animacja', value: destUrl }];
          }

          await collection.updateOne(
            { _id: exId },
            {
              $set: {
                setup: updatedSetup,
                updatedAt: new Date(),
              },
            }
          );

          // Zaktualizuj obiekt w pamięci
          targetEx.setup = updatedSetup;
          assignedExerciseIds.add(exId.toString());

          // Zapisz hash
          hashMap.set(hash, {
            fileName,
            exerciseId: exId.toString(),
            exerciseName: targetEx.name,
            destUrl,
          });

          assignedCount++;
          logMessage(
            `[${new Date().toLocaleTimeString()}] [PRZYPISANO] [${currentIdx}/${allFiles.length}] PLIK: "${fileName}"\n` +
            `  -> ĆWICZENIE: "${targetEx.name}" (${targetEx.original_name || 'brak'}) [ID: ${exId}]\n` +
            `  -> NOWY ZASÓB: ${destUrl}\n` +
            `  -> POPRZEDNI ZASÓB: ${oldAnim || 'brak'}\n` +
            `  -> Wynik dopasowania: ${best.score} (rozpoznano: "${info.exercise_name}")\n` +
            `  -> Plik źródłowy "${fileName}" USUNIĘTO po uploadzie.\n`
          );

          // Usuń plik źródłowy
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.error(`Nie udało się usunąć ${fileName}:`, e);
          }
        }
      } catch (err) {
        unassignedCount++;
        console.error(`Błąd podczas przetwarzania ${fileName}:`, err);
        logMessage(
          `[${new Date().toLocaleTimeString()}] [BŁĄD] [${currentIdx}/${allFiles.length}] PLIK: "${fileName}": ${err instanceof Error ? err.message : err}\n`
        );
      } finally {
        // Sprzątaj tymczasowe klatki
        for (const fr of frames) {
          try {
            if (fs.existsSync(fr)) fs.unlinkSync(fr);
          } catch {}
        }
      }
    }
  }

  // Uruchom workerów
  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  const summary = `\n====================================================================================================
PODSUMOWANIE PROCESU:
- Łącznie plików: ${allFiles.length}
- Pomyślnie przypisano i uploadowano: ${assignedCount}
- Usunięto identycznych duplikatów: ${duplicateCount}
- Nieprzypisanych / wymagających weryfikacji: ${unassignedCount}
- Pozostało plików w katalogu źródłowym: ${fs.readdirSync(SOURCE_DIR).length}
Zakończono: ${new Date().toISOString()}
Panel administracyjny: http://localhost:3001/admin/exercises
====================================================================================================\n`;
  logMessage(summary);

  await mongoose.disconnect();
  console.log('Gotowe!');
}

main().catch(async (e) => {
  console.error('Fatal error:', e);
  await mongoose.disconnect();
  process.exit(1);
});
