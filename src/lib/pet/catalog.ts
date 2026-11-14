/**
 * Katalog zwierzaka: gatunki i przedmioty sklepu. Żyje w kodzie (jak katalog
 * osiągnięć), więc ceny i efekty zmienia się jednym commitem, bez migracji.
 * Grafiki SVG po stronie aplikacji są dopasowane po `key`.
 */

export const PET_SPECIES = ['hamster', 'fox', 'bear'] as const;
export type PetSpecies = (typeof PET_SPECIES)[number];

export const SPECIES_META: Record<PetSpecies, { name: string; description: string }> = {
  hamster: { name: 'Chomik', description: 'Mały sprinter. Kocha bieżnię i przekąski.' },
  fox: { name: 'Lis', description: 'Zwinny i ciekawski. Zawsze gotowy na przebieżkę.' },
  bear: { name: 'Niedźwiadek', description: 'Spokojny siłacz. Lubi ciężary i drzemki.' },
};

export const PET_ITEM_CATEGORIES = ['food', 'toy', 'clothes', 'decor'] as const;
export type PetItemCategory = (typeof PET_ITEM_CATEGORIES)[number];

export const PET_SLOTS = ['head', 'eyes', 'back', 'wrists', 'feet'] as const;
export type PetSlot = (typeof PET_SLOTS)[number];

export interface PetItem {
  key: string;
  category: PetItemCategory;
  name: string;
  description: string;
  price: number;
  /** Jedzenie: ile sytości dodaje (0–100). */
  hunger?: number;
  /** Jedzenie i zabawki: ile radości dodaje. */
  joy?: number;
  /** Jedzenie: przez tyle godzin po posiłku sytość nie spada („syci na dłużej”). */
  holdHours?: number;
  /** Odżywki: tymczasowy połysk futerka przez tyle godzin. */
  shineHours?: number;
  /** Ubranka: miejsce na zwierzaku. */
  slot?: PetSlot;
  /** Wystrój: tło pokoju albo mebel. */
  decor?: 'background' | 'furniture';
}

/** Tło, które każdy ma od początku. */
export const DEFAULT_BACKGROUND = 'bg_room';

/** Najdroższy przedmiot, jaki może wypaść ze skrzyni — droższe trzeba kupić. */
export const CHEST_MAX_ITEM_PRICE = 1500;

/**
 * Jedzenie zostaje tanie, bo to codzienny wydatek. Przedmioty trwałe (zabawki,
 * ubranka, wystrój) drożeją wykładniczo — w każdej kategorii kolejny kosztuje
 * ok. 2–3× więcej. Przy ~1000 FitCoins tygodniowo najtańsze są w zasięgu po
 * kilku dniach, a komplet (~107 tys.) to cel na 2–3 lata.
 */
export const PET_ITEMS: PetItem[] = [
  // Jedzenie i suplementy
  { key: 'food_kibble', category: 'food', name: 'Karma', description: 'Podstawowa miska chrupek.', price: 15, hunger: 25 },
  { key: 'food_apple', category: 'food', name: 'Jabłko', description: 'Chrupiąca, zdrowa przekąska.', price: 25, hunger: 30, joy: 5, holdHours: 3 },
  { key: 'food_veggies', category: 'food', name: 'Miska warzyw', description: 'Syci na pół dnia.', price: 45, hunger: 50, holdHours: 12 },
  { key: 'food_chicken_rice', category: 'food', name: 'Kurczak z ryżem', description: 'Klasyk. Pełny brzuszek na całą dobę.', price: 70, hunger: 85, holdHours: 24 },
  { key: 'food_energy_bar', category: 'food', name: 'Baton energetyczny', description: 'Mało syci, za to poprawia humor.', price: 40, hunger: 15, joy: 25 },
  { key: 'food_protein_shake', category: 'food', name: 'Odżywka białkowa', description: 'Futerko lśni przez całą dobę.', price: 120, hunger: 40, joy: 15, holdHours: 6, shineHours: 24 },

  // Zabawki
  { key: 'toy_ball', category: 'toy', name: 'Piłka', description: 'Rzuć, a przyniesie. Może.', price: 150, joy: 20 },
  { key: 'toy_chew', category: 'toy', name: 'Gryzak', description: 'Do gryzienia zamiast kapci.', price: 300, joy: 20 },
  { key: 'toy_rope', category: 'toy', name: 'Lina', description: 'Przeciąganie liny na całego.', price: 600, joy: 25 },
  { key: 'toy_frisbee', category: 'toy', name: 'Frisbee', description: 'Wysokie loty i efektowne chwyty.', price: 1500, joy: 30 },
  { key: 'toy_dumbbells', category: 'toy', name: 'Mini-hantle', description: 'Trening biceps dla pupila.', price: 4000, joy: 35 },
  { key: 'toy_treadmill', category: 'toy', name: 'Bieżnia', description: 'Szybkie nóżki, wielka frajda.', price: 10000, joy: 40 },

  // Ubranka i akcesoria
  { key: 'wear_wristbands', category: 'clothes', name: 'Frotki', description: 'Na łapki, w stylu retro.', price: 200, slot: 'wrists' },
  { key: 'wear_headband', category: 'clothes', name: 'Opaska', description: 'Pot nie zalewa oczu.', price: 500, slot: 'head' },
  { key: 'wear_cap', category: 'clothes', name: 'Czapka z daszkiem', description: 'Sportowa klasyka.', price: 1200, slot: 'head' },
  { key: 'wear_sunglasses', category: 'clothes', name: 'Okulary przeciwsłoneczne', description: 'Luz i blask.', price: 3000, slot: 'eyes' },
  { key: 'wear_sneakers', category: 'clothes', name: 'Sportowe buty', description: 'Amortyzacja na każdy dystans.', price: 8000, slot: 'feet' },
  { key: 'wear_cape', category: 'clothes', name: 'Peleryna superbohatera', description: 'Dla tych, co nie odpuszczają.', price: 20000, slot: 'back' },

  // Wystrój otoczenia
  { key: DEFAULT_BACKGROUND, category: 'decor', name: 'Przytulny pokój', description: 'Tu się wszystko zaczyna.', price: 0, decor: 'background' },
  { key: 'bg_gym', category: 'decor', name: 'Siłownia', description: 'Lustra, guma na podłodze, stojak z hantlami.', price: 5000, decor: 'background' },
  { key: 'bg_forest', category: 'decor', name: 'Leśna polana', description: 'Miękka ścieżka do biegania.', price: 12000, decor: 'background' },
  { key: 'bg_beach', category: 'decor', name: 'Tropikalna plaża', description: 'Palmy, piasek i szum fal.', price: 30000, decor: 'background' },
  { key: 'decor_plant', category: 'decor', name: 'Roślina', description: 'Trochę zieleni w kącie.', price: 250, decor: 'furniture' },
  { key: 'decor_poster', category: 'decor', name: 'Plakat motywacyjny', description: '„Jeszcze jedna seria.”', price: 700, decor: 'furniture' },
  { key: 'decor_bed', category: 'decor', name: 'Legowisko', description: 'Miękkie miejsce na regenerację.', price: 2500, decor: 'furniture' },
  { key: 'decor_trophy', category: 'decor', name: 'Półka z pucharami', description: 'Na przyszłe zwycięstwa.', price: 7500, decor: 'furniture' },
];

const ITEM_BY_KEY = new Map(PET_ITEMS.map(item => [item.key, item]));

export function getPetItem(key: string): PetItem | undefined {
  return ITEM_BY_KEY.get(key);
}

export function isPetSpecies(value: unknown): value is PetSpecies {
  return typeof value === 'string' && (PET_SPECIES as readonly string[]).includes(value);
}
