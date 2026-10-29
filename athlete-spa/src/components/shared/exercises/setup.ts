/**
 * Grupy wpisów `setup` ćwiczenia — tak zapisuje je import openGym
 * (zgodnie z `src/components/shared/exercises/setup.ts` w monolicie).
 */
export const SETUP_GROUPS = {
  bodyPart: 'Część ciała',
  equipment: 'Sprzęt',
  category: 'Kategoria',
  animation: 'Animacja',
} as const;

/** Wartości występujące w rekordach w bazie — używane jako opcje filtrów. */
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
