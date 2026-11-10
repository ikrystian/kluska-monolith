/**
 * Recipe data attached to a knowledge-zone article (category "Przepisy").
 * Macros are per serving, so the athlete can log the dish straight to the
 * food diary from the article. Keep in sync with athlete-spa/src/lib/types.ts.
 */

export const RECIPE_CATEGORY = 'Przepisy';

export const RECIPE_MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
export type RecipeMealType = (typeof RECIPE_MEAL_TYPES)[number];

export interface ArticleRecipe {
  /** Dish name used for the diary entry; falls back to the article title. */
  dishName?: string;
  /** How many servings the recipe makes. */
  servings: number;
  prepMinutes?: number;
  /** Meal the dish suits best — preselected when logging it. */
  mealType?: RecipeMealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Per-serving limits shared by validation of article recipes and diary input. */
export const RECIPE_LIMITS = {
  calories: 3000,
  protein: 300,
  carbs: 500,
  fat: 300,
  servings: 50,
  prepMinutes: 1440,
} as const;

export function isRecipeCategory(category: unknown): boolean {
  return typeof category === 'string' && /przepis/i.test(category);
}

function number(value: unknown, max: number): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Per-serving macros from untrusted input (external API, diary request).
 * Returns null unless calories are present and every value is in range.
 */
export function parseNutrition(input: unknown): Pick<ArticleRecipe, 'calories' | 'protein' | 'carbs' | 'fat'> | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const calories = number(raw.calories ?? raw.kcal, RECIPE_LIMITS.calories);
  if (calories === null || calories <= 0) return null;
  const protein = number(raw.protein ?? 0, RECIPE_LIMITS.protein);
  const carbs = number(raw.carbs ?? 0, RECIPE_LIMITS.carbs);
  const fat = number(raw.fat ?? 0, RECIPE_LIMITS.fat);
  if (protein === null || carbs === null || fat === null) return null;
  return { calories: Math.round(calories), protein: round1(protein), carbs: round1(carbs), fat: round1(fat) };
}

/** Full recipe block from untrusted input; null when it lacks usable macros. */
export function parseRecipe(input: unknown): ArticleRecipe | null {
  const nutrition = parseNutrition(input);
  if (!nutrition) return null;
  const raw = input as Record<string, unknown>;
  const servings = number(raw.servings ?? 1, RECIPE_LIMITS.servings);
  const prepMinutes = number(raw.prepMinutes, RECIPE_LIMITS.prepMinutes);
  const mealType = RECIPE_MEAL_TYPES.find((type) => type === raw.mealType);
  const dishName = typeof raw.dishName === 'string' ? raw.dishName.trim().slice(0, 120) : '';
  return {
    ...nutrition,
    servings: servings && servings >= 1 ? Math.round(servings) : 1,
    ...(prepMinutes ? { prepMinutes: Math.round(prepMinutes) } : {}),
    ...(mealType ? { mealType } : {}),
    ...(dishName ? { dishName } : {}),
  };
}
