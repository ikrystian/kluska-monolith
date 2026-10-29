import { Exercise, ExerciseSetupItem } from '@/models/types';

/**
 * Grupy wpisów `setup` ćwiczenia — tak zapisuje je import openGym i tak samo
 * zapisuje je formularz ćwiczenia.
 */
export const SETUP_GROUPS = {
  bodyPart: 'Część ciała',
  equipment: 'Sprzęt',
  category: 'Kategoria',
  animation: 'Animacja',
} as const;

/** Podpowiedzi wartości (z rekordów w bazie); pola przyjmują też własny tekst. */
export const SETUP_SUGGESTIONS = {
  bodyPart: [
    'uda', 'talia', 'plecy', 'barki', 'ramiona', 'klatka piersiowa', 'całe ciało',
    'podudzia', 'przedramiona', 'cardio', 'szyja',
  ],
  equipment: [
    'masa ciała', 'hantle', 'wyciąg', 'guma oporowa', 'sztanga', 'maszyna dźwigniowa',
    'kettlebell', 'z obciążeniem', 'taśmy TRX', 'maszyna Smitha', 'piłka stabilizacyjna',
    'piłka lekarska', 'sztanga łamana', 'wałek', 'saneczki obciążeniowe', 'piłka do masażu',
    'talara', 'lina', 'z odciążeniem', 'landmine', 'bosu', 'worek piaskowy', 'sztanga trap',
    'sztanga olimpijska', 'orbitrek', 'rower stacjonarny', 'kółko do ćwiczeń', 'opona',
    'macebell', 'ergometr górnych partii ciała', 'młot', 'ergometr narciarski', 'stepmill',
  ],
  category: [
    'siłowe', 'kalistenika', 'rozciąganie', 'mobilność', 'plyometria', 'izometria', 'cardio',
    'joga', 'podnoszenie olimpijskie', 'pilates', 'rehabilitacja', 'sporty walki',
  ],
};

/** Zwraca wartość wpisu `setup` z danej grupy, gdy istnieje. */
export function getSetupValue(
  setup: ExerciseSetupItem[] | undefined,
  group: string
): string | undefined {
  return setup?.find((s) => s.group === group && s.value)?.value;
}

/** Zwraca URL animacji ćwiczenia, gdy istnieje. */
export function getAnimationUrl(exercise: Pick<Exercise, 'setup'> | null | undefined): string | undefined {
  return getSetupValue(exercise?.setup, SETUP_GROUPS.animation);
}

/**
 * Zwraca kopię `setup` z podmienionymi wartościami podanych grup (pusta wartość
 * usuwa wpis). Kolejność istniejących wpisów i pozostałe grupy zostają bez zmian;
 * nowe grupy są dopisywane na końcu.
 */
export function withSetupValues(
  setup: ExerciseSetupItem[] | undefined,
  values: Record<string, string | undefined>
): ExerciseSetupItem[] {
  const result: ExerciseSetupItem[] = [];
  const handled = new Set<string>();

  for (const { group, value } of setup ?? []) {
    if (!(group in values)) {
      result.push({ group, value });
      continue;
    }
    if (handled.has(group)) continue; // duplikaty grupy zastępuje jeden wpis
    handled.add(group);
    const next = values[group]?.trim();
    if (next) result.push({ group, value: next });
  }

  for (const [group, value] of Object.entries(values)) {
    const next = value?.trim();
    if (!handled.has(group) && next) result.push({ group, value: next });
  }

  return result;
}

/** Czy URL wskazuje na plik wideo (MP4/WebM), a nie obrazek/GIF. */
export function isVideoFileUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm)(\?|#|$)/i.test(url);
}
