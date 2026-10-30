import type { TrainerCard } from '@/lib/types';

export type CooperationMode = NonNullable<TrainerCard['cooperationMode']>;
export type Availability = NonNullable<TrainerCard['availability']>;
export type ResponseTime = NonNullable<TrainerCard['responseTime']>;

export const MODE_LABEL: Record<CooperationMode, string> = {
  gym: 'Stacjonarnie',
  online: 'Online',
  both: 'Stacjonarnie i online',
};

export const AVAILABILITY: Record<Availability, { label: string; short: string; dot: string; ping: boolean }> = {
  open: { label: 'Przyjmuje nowych podopiecznych', short: 'Wolne miejsca', dot: 'bg-emerald-400', ping: true },
  limited: { label: 'Ostatnie wolne miejsca', short: 'Ostatnie miejsca', dot: 'bg-amber-400', ping: true },
  closed: { label: 'Chwilowo brak miejsc', short: 'Brak miejsc', dot: 'bg-zinc-400', ping: false },
};

export const RESPONSE_LABEL: Record<ResponseTime, string> = {
  hour: 'do godziny',
  day: 'do 24 h',
  few_days: 'do 2–3 dni',
};

export const INQUIRY_GOALS = [
  'Redukcja wagi',
  'Budowa masy',
  'Siła',
  'Kondycja',
  'Powrót po kontuzji',
  'Inny cel',
] as const;

/** Polish plural: 1 → `one`, 2-4 (not 12-14) → `few`, otherwise `many`. */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const lastTwo = n % 100;
  const last = n % 10;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
}

/** A trainer's card, but only when they chose to publish it. */
export function publishedCard(trainer: { trainerCard?: TrainerCard }): TrainerCard | undefined {
  return trainer.trainerCard?.published ? trainer.trainerCard : undefined;
}
