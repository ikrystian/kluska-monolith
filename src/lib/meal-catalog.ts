/**
 * Shared vocabulary for ready-made dishes (SavedMeal): dish categories used
 * for browsing/search, plus a diacritic-tolerant search helper.
 * Keep DISH_CATEGORIES in sync with athlete-spa/src/lib/nutrition.ts.
 */

export const DISH_CATEGORIES = [
    'breakfast',
    'soup',
    'polish',
    'meat',
    'fish',
    'pasta',
    'salad',
    'vegetarian',
    'snack',
    'dessert',
    'other',
] as const;

export type DishCategory = (typeof DISH_CATEGORIES)[number];

export const DISH_CATEGORY_LABELS: Record<DishCategory, string> = {
    breakfast: 'Śniadania',
    soup: 'Zupy',
    polish: 'Kuchnia polska',
    meat: 'Dania mięsne',
    fish: 'Ryby i owoce morza',
    pasta: 'Makarony, ryż i kasze',
    salad: 'Sałatki',
    vegetarian: 'Wegetariańskie',
    snack: 'Przekąski',
    dessert: 'Desery i wypieki',
    other: 'Inne',
};

export function isDishCategory(value: unknown): value is DishCategory {
    return typeof value === 'string' && (DISH_CATEGORIES as readonly string[]).includes(value);
}

/** Owner id used for meals seeded by the system (not tied to any trainer). */
export const SYSTEM_MEAL_OWNER = 'system';

const DIACRITIC_CLASSES: Record<string, string> = {
    a: '[aą]', c: '[cć]', e: '[eę]', l: '[lł]', n: '[nń]', o: '[oó]', s: '[sś]', z: '[zźż]',
    ą: '[aą]', ć: '[cć]', ę: '[eę]', ł: '[lł]', ń: '[nń]', ó: '[oó]', ś: '[sś]', ź: '[zźż]', ż: '[zźż]',
};

/**
 * Builds a case-insensitive regex source that matches Polish text whether or
 * not the user typed diacritics ("zurek" finds "Żurek").
 */
export function diacriticInsensitivePattern(query: string): string {
    return Array.from(query.trim().toLowerCase().slice(0, 60))
        .map((char) => DIACRITIC_CLASSES[char] ?? char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('');
}

/**
 * Mongo filter for meals a user may find and log: every public meal, plus
 * private meals of the user's own trainer (and their own, for trainers).
 */
export function visibleMealsFilter(userId: string, trainerId?: string | null) {
    const owners = [userId, trainerId].filter((id): id is string => Boolean(id));
    return { $or: [{ isPublic: true }, { trainerId: { $in: owners } }] };
}
