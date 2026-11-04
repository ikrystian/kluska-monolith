/** Polish needs three noun forms: 1 seria, 2 serie, 5 serii. */
export function pluralForm(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one;
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many;
}

/** `5 ćwiczeń`, `2 ćwiczenia`, `1 ćwiczenie`. */
export function plural(count: number, one: string, few: string, many: string): string {
  return `${count} ${pluralForm(count, one, few, many)}`;
}

export const exercisesLabel = (count: number) => plural(count, 'ćwiczenie', 'ćwiczenia', 'ćwiczeń');
export const setsLabel = (count: number) => plural(count, 'seria', 'serie', 'serii');
export const workoutsLabel = (count: number) => plural(count, 'trening', 'treningi', 'treningów');
export const daysLabel = (count: number) => plural(count, 'dzień', 'dni', 'dni');
