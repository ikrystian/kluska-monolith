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
