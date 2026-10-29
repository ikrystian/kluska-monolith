import { MuscleGroupName } from '@/models/types/enums';
import type { DownloadedMedia } from '@/lib/import-exercise-media';

/**
 * Importer ćwiczeń z pliku openGym (opengym-exercises-pl.json) do modelu
 * `Exercise`. Zachowuje strukturę obecną w bazie:
 *  - name, mainMuscleGroups, secondaryMuscleGroups, setup, instructions,
 *    mediaUrl, type + pola legacy (muscleGroup, description, image, imageHint, ownerId)
 *
 * Grupy mięśniowe z pliku (angielskie klucze openGym) są mapowane na enum
 * `MuscleGroupName`, dzięki czemu nowe ćwiczenia działają z filtrami i
 * komponentami aplikacji od razu.
 */

// openGym muscle key -> app's MuscleGroupName enum value
const MUSCLE_TO_GROUP: Record<string, MuscleGroupName> = {
  abductors: MuscleGroupName.Abductors,
  abs: MuscleGroupName.Core,
  abdominals: MuscleGroupName.Core,
  adductors: MuscleGroupName.Adductors,
  'ankle stabilizers': MuscleGroupName.Hips,
  ankles: MuscleGroupName.Hips,
  back: MuscleGroupName.Back,
  biceps: MuscleGroupName.Biceps,
  brachialis: MuscleGroupName.Biceps,
  calves: MuscleGroupName.Calves,
  'cardiovascular system': MuscleGroupName.FullBody,
  chest: MuscleGroupName.Chest,
  core: MuscleGroupName.Core,
  deltoids: MuscleGroupName.Shoulders,
  delts: MuscleGroupName.Shoulders,
  feet: MuscleGroupName.Hips,
  forearms: MuscleGroupName.Forearms,
  glutes: MuscleGroupName.Glutes,
  'grip muscles': MuscleGroupName.Forearms,
  groin: MuscleGroupName.Hips,
  hamstrings: MuscleGroupName.Hamstrings,
  hands: MuscleGroupName.Forearms,
  'hip flexors': MuscleGroupName.Hips,
  'inner thighs': MuscleGroupName.Adductors,
  'latissimus dorsi': MuscleGroupName.Back,
  lats: MuscleGroupName.Back,
  'levator scapulae': MuscleGroupName.Traps,
  'lower abs': MuscleGroupName.Core,
  'lower back': MuscleGroupName.LowerBack,
  obliques: MuscleGroupName.Core,
  pectorals: MuscleGroupName.Chest,
  'quadriceps': MuscleGroupName.Quads,
  quads: MuscleGroupName.Quads,
  'rear deltoids': MuscleGroupName.RearDelts,
  rhomboids: MuscleGroupName.Back,
  'rotator cuff': MuscleGroupName.Shoulders,
  'serratus anterior': MuscleGroupName.Core,
  shins: MuscleGroupName.Calves,
  shoulders: MuscleGroupName.Shoulders,
  soleus: MuscleGroupName.Calves,
  spine: MuscleGroupName.Core,
  'sternocleidomastoid': MuscleGroupName.Traps,
  trapezius: MuscleGroupName.Traps,
  traps: MuscleGroupName.Traps,
  triceps: MuscleGroupName.Triceps,
  'upper back': MuscleGroupName.Back,
  'upper chest': MuscleGroupName.Chest,
  'wrist extensors': MuscleGroupName.Forearms,
  'wrist flexors': MuscleGroupName.Forearms,
  wrists: MuscleGroupName.Forearms,
};

const WEIGHT_EQUIPMENT = new Set([
  'assisted',
  'barbell',
  'cable',
  'dumbbell',
  'ez barbell',
  'hammer',
  'kettlebell',
  'landmine',
  'leverage machine',
  'macebell',
  'olympic barbell',
  'sandbag',
  'sled machine',
  'smith machine',
  'tire',
  'trap bar',
  'weight plate',
  'weighted',
]);

const DURATION_CATEGORIES = new Set([
  'isometric',
  'mobility',
  'pilates',
  'stretching',
  'yoga',
]);

export interface OpenGymExercise {
  id: string;
  name: string;
  name_pl: string;
  category: string;
  category_pl: string;
  body_part: string;
  body_part_pl: string;
  equipment: string;
  equipment_pl: string;
  target_muscle: string;
  target_muscle_pl: string;
  main_muscle_group: string | null;
  main_muscle_group_pl: string | null;
  secondary_muscles?: string[];
  secondary_muscles_pl?: string[];
  image_url: string;
  animation_url: string;
  description: string;
}

/** Mapa grupy mięśniowej openGym -> enum aplikacji (null gdy brak odwzorowania). */
export function mapMuscleToGroup(muscle: string | null | undefined): MuscleGroupName | null {
  if (!muscle) return null;
  return MUSCLE_TO_GROUP[muscle] ?? null;
}

/** Wyznacza typ ćwiczenia z kategorii/sprzętu. */
export function inferExerciseType(category: string, equipment: string): 'weight' | 'duration' | 'reps' {
  if (WEIGHT_EQUIPMENT.has(equipment)) return 'weight';
  if (DURATION_CATEGORIES.has(category)) return 'duration';
  return 'reps';
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function muscleGroupsFrom(keys: (string | null | undefined)[]): { name: string }[] {
  return unique(
    keys.map(mapMuscleToGroup).filter((g): g is MuscleGroupName => g !== null)
  ).map((name) => ({ name }));
}

interface ParsedExercise {
  id: string;
  name: string;
  category: string;
  category_pl: string;
  body_part_pl: string;
  equipment: string;
  equipment_pl: string;
  image_url: string;
  animation_url: string;
  description: string;
  mainMuscleKeys: (string | null)[];
  secondaryMuscleKeys: string[];
}

/** Czyta i normalizuje plik opengym-exercises-pl.json. */
export function parseOpenGymExercises(raw: unknown): ParsedExercise[] {
  if (!raw || typeof raw !== 'object') throw new Error('Nieprawidłowa struktura pliku JSON');
  const root = raw as { exercises?: unknown[] };
  if (!Array.isArray(root.exercises)) throw new Error('Brak tablicy "exercises" w pliku JSON');

  return root.exercises.map((entry) => {
    const e = entry as OpenGymExercise;
    const mainKeys = [e.target_muscle, e.main_muscle_group];
    return {
      id: String(e.id ?? ''),
      // Angielska nazwa ćwiczenia jest zapisywana w bazie (name_pl jest dalej
      // dostępna w pliku źródłowym, ale import zapisuje wersję oryginalną).
      name: e.name || e.name_pl,
      category: e.category,
      category_pl: e.category_pl || e.category,
      body_part_pl: e.body_part_pl || e.body_part,
      equipment: e.equipment,
      equipment_pl: e.equipment_pl || e.equipment,
      image_url: e.image_url,
      animation_url: e.animation_url,
      description: e.description,
      mainMuscleKeys: mainKeys,
      secondaryMuscleKeys: Array.isArray(e.secondary_muscles) ? e.secondary_muscles : [],
    };
  });
}

export interface BuiltExercise {
  name: string;
  mainMuscleGroups: { name: string }[];
  secondaryMuscleGroups: { name: string }[];
  setup: { group: string; value: string }[];
  instructions: string;
  description: string;
  mediaUrl: string;
  muscleGroup: string | undefined;
  image: string;
  imageHint: string;
  ownerId: 'public';
  type: 'weight' | 'duration' | 'reps';
}

/** Mapuje pojedyncze ćwiczenie openGym na dokument zgodny z modelem Exercise. */
export function buildExerciseDoc(
  ex: ParsedExercise,
  media?: Partial<DownloadedMedia>
): BuiltExercise {
  const mainGroups = muscleGroupsFrom(ex.mainMuscleKeys);
  const secondaryKeys = ex.secondaryMuscleKeys.filter(
    (k) => !ex.mainMuscleKeys.includes(k)
  );
  const secondaryGroups = muscleGroupsFrom(secondaryKeys);
  const mainNames = new Set(mainGroups.map((g) => g.name));

  const setup: { group: string; value: string }[] = [];
  if (ex.body_part_pl) setup.push({ group: 'Część ciała', value: ex.body_part_pl });
  if (ex.equipment_pl) setup.push({ group: 'Sprzęt', value: ex.equipment_pl });
  if (ex.category_pl) setup.push({ group: 'Kategoria', value: ex.category_pl });

  const type = inferExerciseType(ex.category, ex.equipment);

  // Lokalne pliki mają pierwszeństwo; oryginalne URL-e są tylko fallbackiem,
  // gdyby pobranie się nie powiodło.
  const localImage = media?.imageUrl;
  const localAnimation = media?.animationUrl;
  const mediaUrl = localImage || ex.image_url;

  if (localAnimation) {
    setup.push({ group: 'Animacja', value: localAnimation });
  }

  return {
    name: ex.name,
    mainMuscleGroups: mainGroups,
    // MuscleGroupName is a string enum so the shape matches { name: string }
    secondaryMuscleGroups: secondaryGroups.filter((g) => !mainNames.has(g.name)),
    setup,
    instructions: ex.description,
    description: ex.description,
    mediaUrl,
    muscleGroup: mainGroups[0]?.name,
    image: mediaUrl,
    imageHint: ex.name.toLowerCase(),
    ownerId: 'public',
    type,
  };
}

/** Przygotowuje dokumenty do wsadu. Pomija wpisy bez nazwy. */
export function buildExerciseDocs(parsed: ParsedExercise[]): BuiltExercise[] {
  const seen = new Set<string>();
  const docs: BuiltExercise[] = [];
  for (const ex of parsed) {
    if (!ex.name) continue;
    const lower = ex.name.toLowerCase();
    if (seen.has(lower)) continue; // duplikaty wewnątrz pliku
    seen.add(lower);
    docs.push(buildExerciseDoc(ex));
  }
  return docs;
}