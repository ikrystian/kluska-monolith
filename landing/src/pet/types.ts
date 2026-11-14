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
