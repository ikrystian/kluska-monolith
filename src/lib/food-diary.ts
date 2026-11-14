/** Shared helpers of the athlete's food diary routes (/api/athlete/nutrition/*). */

export const DIARY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const DIARY_MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

/** A real calendar day written as YYYY-MM-DD (rejects 2026-02-31 and the like). */
export function isDiaryDate(value: unknown): value is string {
    if (typeof value !== 'string' || !DIARY_DATE_PATTERN.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Polish plural for "serving": 1 porcja, 2–4 porcje, 5+ and fractions porcji. */
export function servingsUnit(n: number): string {
    if (n === 1) return 'porcja';
    if (Number.isInteger(n) && n >= 2 && n <= 4) return 'porcje';
    return 'porcji';
}

/** Entries counted in servings carry one of the plural forms as their unit. */
export function isServingsUnit(unit: string | undefined): boolean {
    return unit === 'porcja' || unit === 'porcje' || unit === 'porcji';
}

export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
