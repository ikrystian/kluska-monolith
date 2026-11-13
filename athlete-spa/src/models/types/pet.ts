/**
 * Zwierzak — kształty odpowiadają backendowi (`src/lib/pet/*` w aplikacji
 * głównej). Typy nie są współdzielone, więc to ręczne lustro.
 */

export type PetSpecies = 'hamster' | 'fox' | 'bear';
export type PetStage = 'baby' | 'junior' | 'adult' | 'master';
export type PetBuild = 'runner' | 'strong' | 'balanced';
export type PetMood = 'energetic' | 'happy' | 'hungry' | 'sad' | 'lazy' | 'sleepy';
export type PetThought = 'food' | 'play' | 'workout' | null;
export type PetSlot = 'head' | 'eyes' | 'back' | 'wrists' | 'feet';
export type PetItemCategory = 'food' | 'toy' | 'clothes' | 'decor';

export interface PetItem {
  key: string;
  category: PetItemCategory;
  name: string;
  description: string;
  price: number;
  hunger?: number;
  joy?: number;
  holdHours?: number;
  shineHours?: number;
  slot?: PetSlot;
  decor?: 'background' | 'furniture';
}

export interface PetProgress {
  xp: number;
  level: number;
  stage: PetStage;
  stageName: string;
  nextStage: PetStage | null;
  /** 0–1 */
  stageProgress: number;
  xpToNextStage: number;
  build: PetBuild;
}

export interface PetView {
  id: string;
  species: PetSpecies;
  speciesName: string;
  name: string;
  hunger: number;
  joy: number;
  form: number;
  mood: PetMood;
  thought: PetThought;
  shiny: boolean;
  equipped: Partial<Record<PetSlot, string>>;
  progress: PetProgress;
  mastered: boolean;
  hungryAt: string | null;
  adoptedAt: string;
}

export type ChestSource = 'personal_record' | 'longest_run';
export type ChestLoot = { kind: 'coins'; amount: number } | { kind: 'item'; itemKey: string; name: string; qty: number };

export interface PetState {
  balance: number;
  activePetId: string | null;
  pets: PetView[];
  inventory: { itemKey: string; qty: number }[];
  ownedItems: string[];
  room: { background: string; furniture: string[] };
  chests: { id: string; source: ChestSource; createdAt: string }[];
  canAdopt: boolean;
  adoptableSpecies: { key: PetSpecies; name: string; description: string }[];
  lastActiveDay: string | null;
  catalog: PetItem[];
}

/** Co zwierzak dostał za trening albo bieg (`rewards.pet`). */
export interface PetWorkoutGain {
  name: string;
  species: PetSpecies;
  xpGained: number;
  stageUp: { from: PetStage; to: PetStage; toName: string } | null;
}

/** Podsumowanie nagród zapisane na biegu (`runningSession.rewards`). */
export interface RunRewardSummary {
  xp: number;
  runXp: number;
  coins: number;
  multiplier: number;
  weekStreak: number;
  distanceKm: number;
  enduranceBonus: number;
  longestRun: boolean;
  chest: boolean;
  pet: PetWorkoutGain | null;
  level: number;
  levelUp: { from: number; to: number } | null;
}
