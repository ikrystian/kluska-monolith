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
}

export interface DiaryResponse {
    entries: DiaryEntry[];
    totals: DiaryTotals;
    goal: DiaryGoal | null;
}

export function productId(product: FoodProduct): string | undefined {
    return product._id ?? product.id;
}

/** Today's date in the device's local timezone as YYYY-MM-DD. */
export function todayISO(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
    source: 'search' | 'barcode' | 'manual' | 'meal';
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
    const per = (value: number) => Math.round(((value / Math.max(food.amount, 0.1)) * 100) * 10) / 10;
    return {
        date,
        mealType,
        name: food.name,
        amount: food.amount,
        per100: { calories: per(food.calories), protein: per(food.protein), carbs: per(food.carbs), fat: per(food.fat) },
        productId: food.productId,
        barcode: food.barcode,
        source: food.source === 'meal' ? 'manual' : food.source,
    };
}
