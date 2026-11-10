import { isDishCategory, type DishCategory } from '@/lib/meal-catalog';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
const INGREDIENT_SOURCES = ['fatsecret', 'manual', 'ai'] as const;

export interface SavedMealPayload {
    name: string;
    description?: string;
    category: (typeof MEAL_TYPES)[number];
    dishCategory: DishCategory;
    isPublic: boolean;
    ingredients: {
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        source: (typeof INGREDIENT_SOURCES)[number];
        fatSecretId?: string;
        amount?: number;
        unit?: string;
    }[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
}

const num = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Validates a meal create/update body shared by the trainer and admin APIs.
 * Totals are recomputed from the ingredients so they can't drift from them.
 */
export function parseSavedMealPayload(body: any): { data: SavedMealPayload } | { error: string } {
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) return { error: 'Nazwa posiłku jest wymagana' };
    if (name.length > 120) return { error: 'Nazwa posiłku jest za długa' };

    if (!Array.isArray(body?.ingredients) || body.ingredients.length === 0) {
        return { error: 'Posiłek musi mieć przynajmniej jeden składnik' };
    }

    const ingredients: SavedMealPayload['ingredients'] = [];
    for (const raw of body.ingredients.slice(0, 50)) {
        const ingredientName = typeof raw?.name === 'string' ? raw.name.trim() : '';
        if (!ingredientName) return { error: 'Każdy składnik musi mieć nazwę' };
        ingredients.push({
            name: ingredientName,
            calories: round1(num(raw.calories)),
            protein: round1(num(raw.protein)),
            carbs: round1(num(raw.carbs)),
            fat: round1(num(raw.fat)),
            source: INGREDIENT_SOURCES.includes(raw.source) ? raw.source : 'manual',
            fatSecretId: typeof raw.fatSecretId === 'string' ? raw.fatSecretId : undefined,
            amount: raw.amount === undefined ? undefined : num(raw.amount),
            unit: typeof raw.unit === 'string' && raw.unit.trim() ? raw.unit.trim() : 'g',
        });
    }

    const totals = ingredients.reduce(
        (acc, i) => ({
            calories: acc.calories + i.calories,
            protein: acc.protein + i.protein,
            carbs: acc.carbs + i.carbs,
            fat: acc.fat + i.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 500) : '';

    return {
        data: {
            name,
            description: description || undefined,
            category: MEAL_TYPES.includes(body.category) ? body.category : 'Breakfast',
            dishCategory: isDishCategory(body.dishCategory) ? body.dishCategory : 'other',
            isPublic: body.isPublic === true,
            ingredients,
            totalCalories: Math.round(totals.calories),
            totalProtein: round1(totals.protein),
            totalCarbs: round1(totals.carbs),
            totalFat: round1(totals.fat),
        },
    };
}
