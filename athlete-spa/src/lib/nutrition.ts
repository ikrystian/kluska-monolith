export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
    Breakfast: 'Śniadanie',
    Lunch: 'Obiad',
    Dinner: 'Kolacja',
    Snack: 'Przekąska',
};

/** Product with nutrition per 100 g, as returned by the nutrition API. */
export interface FoodProduct {
    _id?: string;
    id?: string;
    name: string;
    brand?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    unit: string;
    barcode?: string;
    /** Product photo URL (e.g. from Open Food Facts) when available. */
    imageUrl?: string;
}

export interface DiaryEntry {
    id: string;
    date: string;
    mealType: MealType;
    name: string;
    amount: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    /** SavedMeal id ('meal'), article id ('recipe') or product id. */
    productId?: string;
    source?: RecentFood['source'];
}

export interface DiaryTotals {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface DiaryGoal {
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs: number;
    dailyFat: number;
    /** The active goal was set by the athlete's trainer rather than by the athlete. */
    setByTrainer?: boolean;
}

/** One day of /api/athlete/nutrition/diary/summary (days without entries are left out). */
export interface DiaryDaySummary extends DiaryTotals {
    date: string;
    entries: number;
}

/** The three macros in display order, with the series colours shared with the diet plan charts. */
export const MACROS = [
    { key: 'protein', label: 'Białko', short: 'B', goalKey: 'dailyProtein', kcalPerGram: 4, color: 'hsl(var(--chart-1))' },
    { key: 'carbs', label: 'Węgle', short: 'W', goalKey: 'dailyCarbs', kcalPerGram: 4, color: 'hsl(var(--chart-2))' },
    { key: 'fat', label: 'Tłuszcz', short: 'T', goalKey: 'dailyFat', kcalPerGram: 9, color: 'hsl(var(--chart-4))' },
] as const;

export const formatKcal = (value: number) => Math.round(value).toLocaleString('pl-PL');

/** Macro grams without a trailing ",0": 12, 3,5. */
export const formatGrams = (value: number) => (Math.round(value * 10) / 10).toLocaleString('pl-PL', { maximumFractionDigits: value >= 100 ? 0 : 1 });

/** Entries counted in servings carry one of the Polish plural forms as their unit. */
export function isServingsUnit(unit: string | undefined): boolean {
    return unit === 'porcja' || unit === 'porcje' || unit === 'porcji';
}

export function sumTotals(entries: DiaryTotals[]): DiaryTotals {
    return entries.reduce<DiaryTotals>(
        (acc, entry) => ({
            calories: acc.calories + entry.calories,
            protein: acc.protein + entry.protein,
            carbs: acc.carbs + entry.carbs,
            fat: acc.fat + entry.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
}

export interface DiaryResponse {
    entries: DiaryEntry[];
    totals: DiaryTotals;
    goal: DiaryGoal | null;
}

export function productId(product: FoodProduct): string | undefined {
    return product._id ?? product.id;
}

/** A date in the device's local timezone as YYYY-MM-DD (today by default). */
export function todayISO(offsetDays = 0): string {
    const now = new Date();
    now.setDate(now.getDate() + offsetDays);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const toISO = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** `date` (YYYY-MM-DD) moved by a number of days. */
export function shiftISO(date: string, days: number): string {
    const [year, month, day] = date.split('-').map(Number);
    return toISO(new Date(year, month - 1, day + days));
}

/** The Monday-to-Sunday week containing `date`, as seven YYYY-MM-DD strings. */
export function weekOf(date: string): string[] {
    const [year, month, day] = date.split('-').map(Number);
    const weekday = (new Date(year, month - 1, day).getDay() + 6) % 7; // Monday = 0
    return Array.from({ length: 7 }, (_, index) => shiftISO(date, index - weekday));
}

/** The meal that makes sense to log right now. */
export function mealForNow(): MealType {
    const hour = new Date().getHours();
    if (hour < 11) return 'Breakfast';
    if (hour < 16) return 'Lunch';
    if (hour < 21) return 'Dinner';
    return 'Snack';
}

/** Dish categories of ready-made meals — keep in sync with src/lib/meal-catalog.ts in the backend. */
export type DishCategory =
    | 'breakfast' | 'soup' | 'polish' | 'meat' | 'fish' | 'pasta'
    | 'salad' | 'vegetarian' | 'snack' | 'dessert' | 'other';

export const DISH_CATEGORIES: { value: DishCategory; label: string }[] = [
    { value: 'breakfast', label: 'Śniadania' },
    { value: 'soup', label: 'Zupy' },
    { value: 'polish', label: 'Kuchnia polska' },
    { value: 'meat', label: 'Dania mięsne' },
    { value: 'fish', label: 'Ryby' },
    { value: 'pasta', label: 'Makarony i ryż' },
    { value: 'salad', label: 'Sałatki' },
    { value: 'vegetarian', label: 'Wegetariańskie' },
    { value: 'snack', label: 'Przekąski' },
    { value: 'dessert', label: 'Desery' },
    { value: 'other', label: 'Inne' },
];

/** Ready-made dish with macros for one serving, as returned by /api/athlete/nutrition/meals. */
export interface ReadyMeal {
    id: string;
    name: string;
    description?: string;
    mealType: MealType;
    dishCategory: DishCategory;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    ingredients: { name: string; amount?: number; unit?: string }[];
    /** Private meal prepared by the athlete's own trainer. */
    fromTrainer: boolean;
}

/** Serving weight in grams when every ingredient is measured in g/ml. */
export function mealWeight(meal: ReadyMeal): number | null {
    let total = 0;
    for (const ingredient of meal.ingredients) {
        if (ingredient.amount == null || !['g', 'ml'].includes(ingredient.unit ?? 'g')) return null;
        total += ingredient.amount;
    }
    return total > 0 ? Math.round(total) : null;
}

/** A food the athlete logged recently, as returned by /api/athlete/nutrition/recent. */
export interface RecentFood {
    name: string;
    amount: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    /** 'recipe' — dish from a knowledge-zone recipe; productId is the article id. */
    source: 'search' | 'barcode' | 'manual' | 'meal' | 'recipe';
    productId?: string;
    barcode?: string;
    /** How many times it was logged in the last 30 days. */
    count: number;
}

/** Diary POST body that logs the same food again with the same amount. */
export function relogBody(food: RecentFood, date: string, mealType: MealType) {
    if (food.source === 'meal' && food.productId) {
        return { date, mealType, mealId: food.productId, servings: food.amount };
    }
    if (food.source === 'recipe' && food.productId) {
        // The logged portion carries its own per-serving estimate, used when the recipe has none.
        const perServing = (value: number) => Math.round((value / Math.max(food.amount, 0.25)) * 10) / 10;
        return {
            date,
            mealType,
            articleId: food.productId,
            servings: food.amount,
            nutrition: { calories: perServing(food.calories), protein: perServing(food.protein), carbs: perServing(food.carbs), fat: perServing(food.fat) },
        };
    }
    // Entries without a per-100 g base (quick calorie notes) repeat with the totals they were logged with.
    if (food.unit !== 'g') {
        return { date, mealType, entry: entryPayload(food) };
    }
    const per = (value: number) => Math.round(((value / Math.max(food.amount, 0.1)) * 100) * 10) / 10;
    return {
        date,
        mealType,
        name: food.name,
        amount: food.amount,
        per100: { calories: per(food.calories), protein: per(food.protein), carbs: per(food.carbs), fat: per(food.fat) },
        productId: food.productId,
        barcode: food.barcode,
        source: food.source === 'meal' || food.source === 'recipe' ? 'manual' : food.source,
    };
}

type EntryLike = Pick<DiaryEntry, 'name' | 'amount' | 'unit' | 'calories' | 'protein' | 'carbs' | 'fat' | 'source' | 'productId'> & { barcode?: string };

/** The `entry` object of a diary POST that stores ready totals as they are. */
export function entryPayload(entry: EntryLike) {
    return {
        name: entry.name,
        amount: entry.amount,
        unit: entry.unit === 'g' ? 'g' : 'porcja',
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fat: entry.fat,
        source: entry.source,
        productId: entry.productId,
        barcode: entry.barcode,
    };
}

/** Diary POST body that puts a deleted entry back exactly as it was ("Cofnij"). */
export function restoreBody(entry: DiaryEntry) {
    return { date: entry.date, mealType: entry.mealType, entry: entryPayload(entry) };
}

/* ───────────────────────── Daily goal maths ───────────────────────── */

export type MacroTargets = Pick<DiaryGoal, 'dailyProtein' | 'dailyCarbs' | 'dailyFat'>;

/** Ready-made macro splits as a share of daily calories (protein / carbs / fat). */
export const MACRO_SPLITS = [
    { id: 'balanced', label: 'Zbilansowany', hint: '25 / 45 / 30', protein: 0.25, carbs: 0.45, fat: 0.3 },
    { id: 'protein', label: 'Więcej białka', hint: '35 / 35 / 30', protein: 0.35, carbs: 0.35, fat: 0.3 },
    { id: 'lowcarb', label: 'Mniej węgli', hint: '30 / 25 / 45', protein: 0.3, carbs: 0.25, fat: 0.45 },
] as const;

export type MacroSplitId = (typeof MACRO_SPLITS)[number]['id'];

export function macrosForSplit(calories: number, splitId: MacroSplitId): MacroTargets {
    const split = MACRO_SPLITS.find((item) => item.id === splitId) ?? MACRO_SPLITS[0];
    const grams = (share: number, kcalPerGram: number) => Math.round((calories * share) / kcalPerGram / 5) * 5;
    return { dailyProtein: grams(split.protein, 4), dailyCarbs: grams(split.carbs, 4), dailyFat: grams(split.fat, 9) };
}

/** Which preset the macro targets match (within rounding), if any. */
export function matchSplit(calories: number, targets: MacroTargets): MacroSplitId | null {
    for (const split of MACRO_SPLITS) {
        const preset = macrosForSplit(calories, split.id);
        if (preset.dailyProtein === targets.dailyProtein && preset.dailyCarbs === targets.dailyCarbs && preset.dailyFat === targets.dailyFat) {
            return split.id;
        }
    }
    return null;
}

export const macroCalories = (targets: MacroTargets) => targets.dailyProtein * 4 + targets.dailyCarbs * 4 + targets.dailyFat * 9;

export const ACTIVITY_LEVELS = [
    { id: 'low', label: 'Mała', hint: 'praca siedząca, 0–1 trening', factor: 1.3 },
    { id: 'medium', label: 'Średnia', hint: '2–3 treningi w tygodniu', factor: 1.5 },
    { id: 'high', label: 'Duża', hint: '4–5 treningów w tygodniu', factor: 1.7 },
    { id: 'veryHigh', label: 'Bardzo duża', hint: 'praca fizyczna lub 6+ treningów', factor: 1.9 },
] as const;

export const GOAL_DIRECTIONS = [
    { id: 'cut', label: 'Redukcja', hint: '−15%', factor: 0.85 },
    { id: 'keep', label: 'Utrzymanie', hint: 'bez zmian', factor: 1 },
    { id: 'bulk', label: 'Masa', hint: '+10%', factor: 1.1 },
] as const;

export interface EnergyProfile {
    gender: 'male' | 'female';
    age: number;
    heightCm: number;
    weightKg: number;
    activity: (typeof ACTIVITY_LEVELS)[number]['id'];
    direction: (typeof GOAL_DIRECTIONS)[number]['id'];
}

/**
 * Daily calories estimated with the Mifflin–St Jeor equation, scaled by
 * activity and the chosen direction, rounded to 50 kcal. `null` when the data
 * is incomplete or out of a plausible range.
 */
export function estimateDailyCalories(profile: EnergyProfile): number | null {
    const { gender, age, heightCm, weightKg } = profile;
    if (!(age >= 14 && age <= 100) || !(heightCm >= 120 && heightCm <= 230) || !(weightKg >= 30 && weightKg <= 300)) return null;
    const resting = 10 * weightKg + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161);
    const activity = ACTIVITY_LEVELS.find((level) => level.id === profile.activity)?.factor ?? 1.5;
    const direction = GOAL_DIRECTIONS.find((item) => item.id === profile.direction)?.factor ?? 1;
    return Math.round((resting * activity * direction) / 50) * 50;
}
