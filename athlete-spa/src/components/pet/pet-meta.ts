import { CircleDot, Drumstick, Dumbbell, type LucideIcon } from 'lucide-react';
import type { PetItemCategory, PetMood, PetSlot, PetStage, PetThought, PetView } from '@/models/types/pet';

export const CATEGORY_META: Record<PetItemCategory, { label: string; color: string }> = {
  food: { label: 'Jedzenie', color: 'hsl(var(--food))' },
  toy: { label: 'Zabawki', color: 'hsl(var(--run))' },
  clothes: { label: 'Ubranka', color: 'hsl(var(--social))' },
  decor: { label: 'Wystrój', color: 'hsl(var(--volt))' },
};

export const SLOT_LABEL: Record<PetSlot, string> = {
  head: 'Głowa',
  eyes: 'Oczy',
  back: 'Plecy',
  wrists: 'Łapki',
  feet: 'Stopy',
};

export const STAGE_LABEL: Record<PetStage, string> = {
  baby: 'Maluch',
  junior: 'Junior',
  adult: 'Dorosły',
  master: 'Mistrz',
};

export const MOOD_LABEL: Record<PetMood, string> = {
  energetic: 'Pełen energii',
  happy: 'Zadowolony',
  hungry: 'Głodny',
  sad: 'Smutny',
  lazy: 'Rozleniwiony',
  sleepy: 'Senny',
};

/** Co zwierzak mówi w dymku — jego głosem, bez wyrzutów. */
export function petLine(pet: Pick<PetView, 'mood' | 'thought'>): string {
  if (pet.mood === 'sleepy') return 'Zzz… obudź mnie, jak pójdziemy poćwiczyć.';
  if (pet.thought === 'food') return 'Burczy mi w brzuszku. Masz coś dobrego?';
  if (pet.thought === 'workout') return pet.mood === 'lazy' ? 'Trochę się zasiedziałem. Ruszamy się?' : 'Idziemy potrenować?';
  if (pet.thought === 'play') return 'Pobawisz się ze mną?';
  return pet.mood === 'energetic' ? 'Ale mam dziś moc!' : 'Dobrze mi tu z Tobą.';
}

export const THOUGHT_ICON: Record<Exclude<PetThought, null>, LucideIcon> = {
  food: Drumstick,
  play: CircleDot,
  workout: Dumbbell,
};

/** Efekt przedmiotu jednym zdaniem, do wiersza w sklepie. */
export function itemEffect(item: { hunger?: number; joy?: number; holdHours?: number; shineHours?: number }): string {
  const parts: string[] = [];
  if (item.hunger) parts.push(`+${item.hunger} sytości`);
  if (item.joy) parts.push(`+${item.joy} radości`);
  if (item.holdHours) parts.push(`syci ${item.holdHours} h`);
  if (item.shineHours) parts.push(`połysk ${item.shineHours} h`);
  return parts.join(' · ');
}
