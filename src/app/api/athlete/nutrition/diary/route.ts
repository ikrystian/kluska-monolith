import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { FoodDiaryEntry, type FoodDiaryMealType } from '@/models/FoodDiaryEntry';
import { Article } from '@/models/Article';
import { parseNutrition } from '@/lib/article-recipe';
import { NutritionGoal } from '@/models/NutritionGoal';
import { SavedMeal } from '@/models/SavedMeal';
import { User } from '@/models/User';
import { visibleMealsFilter } from '@/lib/meal-catalog';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

// GET /api/athlete/nutrition/diary?date=YYYY-MM-DD
// Diary entries for the given day plus totals and the athlete's active nutrition goal.
export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const date = request.nextUrl.searchParams.get('date');
        if (!date || !DATE_PATTERN.test(date)) {
            return NextResponse.json({ error: 'Valid date parameter (YYYY-MM-DD) is required' }, { status: 400 });
        }

        await connectToDatabase();

        const [entries, goal] = await Promise.all([
            FoodDiaryEntry.find({ ownerId: user.id, date }).sort({ createdAt: 1 }),
            NutritionGoal.findOne({ ownerId: user.id, isActive: true }).sort({ startDate: -1 }),
        ]);

        const totals = entries.reduce(
            (acc, entry) => ({
                calories: acc.calories + entry.calories,
                protein: acc.protein + entry.protein,
                carbs: acc.carbs + entry.carbs,
                fat: acc.fat + entry.fat,
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        return NextResponse.json({
            entries: entries.map((entry) => entry.toJSON()),
            totals,
            goal: goal
                ? {
                      dailyCalories: goal.dailyCalories,
                      dailyProtein: goal.dailyProtein,
                      dailyCarbs: goal.dailyCarbs,
                      dailyFat: goal.dailyFat,
                  }
                : null,
        });
    } catch (error) {
        console.error('Error fetching food diary:', error);
        return NextResponse.json({ error: 'Failed to fetch food diary' }, { status: 500 });
    }
}

// POST /api/athlete/nutrition/diary
// Adds a product to the diary. Macros are computed server-side from the
// product's per-100g values and the eaten amount, so the client can't drift.
export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { date, mealType, name, amount, per100, productId, barcode, source } = body;

        if (!date || !DATE_PATTERN.test(date)) {
            return NextResponse.json({ error: 'Valid date (YYYY-MM-DD) is required' }, { status: 400 });
        }
        if (!MEAL_TYPES.includes(mealType)) {
            return NextResponse.json({ error: 'Invalid meal type' }, { status: 400 });
        }

        // Ready-made dish: macros come from the stored meal, scaled by servings.
        if (body.mealId !== undefined) {
            return addSavedMeal(user.id, date, mealType, body.mealId, body.servings);
        }
        // Dish from a knowledge-zone recipe article.
        if (body.articleId !== undefined) {
            return addRecipe(user.id, date, mealType, body.articleId, body.servings, body.nutrition);
        }
        if (typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
        }

        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 5000) {
            return NextResponse.json({ error: 'Amount must be between 0 and 5000 g' }, { status: 400 });
        }

        const per100Values = {
            calories: Number(per100?.calories),
            protein: Number(per100?.protein),
            carbs: Number(per100?.carbs),
            fat: Number(per100?.fat),
        };
        const valid = (n: number, max: number) => Number.isFinite(n) && n >= 0 && n <= max;
        if (
            !valid(per100Values.calories, 900) ||
            !valid(per100Values.protein, 100) ||
            !valid(per100Values.carbs, 100) ||
            !valid(per100Values.fat, 100)
        ) {
            return NextResponse.json({ error: 'Invalid nutrition values' }, { status: 400 });
        }

        const factor = parsedAmount / 100;
        const round1 = (n: number) => Math.round(n * 10) / 10;

        await connectToDatabase();

        const entry = await FoodDiaryEntry.create({
            ownerId: user.id,
            date,
            mealType,
            name: name.trim(),
            amount: parsedAmount,
            unit: 'g',
            calories: Math.round(per100Values.calories * factor),
            protein: round1(per100Values.protein * factor),
            carbs: round1(per100Values.carbs * factor),
            fat: round1(per100Values.fat * factor),
            productId: typeof productId === 'string' ? productId : undefined,
            barcode: typeof barcode === 'string' ? barcode : undefined,
            source: ['search', 'barcode', 'manual'].includes(source) ? source : 'search',
        });

        return NextResponse.json({ entry: entry.toJSON() }, { status: 201 });
    } catch (error) {
        console.error('Error adding food diary entry:', error);
        return NextResponse.json({ error: 'Failed to add diary entry' }, { status: 500 });
    }
}

async function addSavedMeal(userId: string, date: string, mealType: FoodDiaryMealType, mealId: unknown, servings: unknown) {
    if (typeof mealId !== 'string' || !/^[a-f\d]{24}$/i.test(mealId)) {
        return NextResponse.json({ error: 'Invalid meal id' }, { status: 400 });
    }
    const parsedServings = parseServings(servings);
    if (parsedServings === null) {
        return NextResponse.json({ error: 'Servings must be between 0.25 and 10' }, { status: 400 });
    }

    await connectToDatabase();
    const profile = await User.findById(userId, { trainerId: 1 }).lean().catch(() => null);
    const trainerId = (profile as { trainerId?: string } | null)?.trainerId ?? null;
    const meal = await SavedMeal.findOne({ _id: mealId, ...visibleMealsFilter(userId, trainerId) });
    if (!meal) {
        return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    const round1 = (n: number) => Math.round(n * 10) / 10;
    const entry = await FoodDiaryEntry.create({
        ownerId: userId,
        date,
        mealType,
        name: meal.name,
        amount: parsedServings,
        unit: servingsUnit(parsedServings),
        calories: Math.round(meal.totalCalories * parsedServings),
        protein: round1(meal.totalProtein * parsedServings),
        carbs: round1(meal.totalCarbs * parsedServings),
        fat: round1(meal.totalFat * parsedServings),
        productId: mealId,
        source: 'meal',
    });

    return NextResponse.json({ entry: entry.toJSON() }, { status: 201 });
}

function parseServings(servings: unknown): number | null {
    const parsed = Number(servings ?? 1);
    return Number.isFinite(parsed) && parsed >= 0.25 && parsed <= 10 ? parsed : null;
}

/**
 * Logs servings of a recipe article's dish. Macros come from the article's
 * recipe block; only when the author left it out may the client supply its
 * own per-serving estimate (the athlete's own diary, so nothing to forge).
 */
async function addRecipe(
    userId: string,
    date: string,
    mealType: FoodDiaryMealType,
    articleId: unknown,
    servings: unknown,
    nutrition: unknown
) {
    if (typeof articleId !== 'string' || !/^[a-f\d]{24}$/i.test(articleId)) {
        return NextResponse.json({ error: 'Invalid article id' }, { status: 400 });
    }
    const parsedServings = parseServings(servings);
    if (parsedServings === null) {
        return NextResponse.json({ error: 'Servings must be between 0.25 and 10' }, { status: 400 });
    }

    await connectToDatabase();
    const article = await Article.findOne({ _id: articleId, status: 'published' }, { title: 1, recipe: 1 }).lean();
    if (!article) {
        return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const perServing = article.recipe?.calories ? article.recipe : parseNutrition(nutrition);
    if (!perServing) {
        return NextResponse.json({ error: 'Recipe has no nutrition data' }, { status: 400 });
    }

    const round1 = (n: number) => Math.round(n * 10) / 10;
    const entry = await FoodDiaryEntry.create({
        ownerId: userId,
        date,
        mealType,
        name: (article.recipe?.dishName || article.title).slice(0, 160),
        amount: parsedServings,
        unit: servingsUnit(parsedServings),
        calories: Math.round(perServing.calories * parsedServings),
        protein: round1(perServing.protein * parsedServings),
        carbs: round1(perServing.carbs * parsedServings),
        fat: round1(perServing.fat * parsedServings),
        productId: articleId,
        source: 'recipe',
    });

    return NextResponse.json({ entry: entry.toJSON() }, { status: 201 });
}

/** Polish plural for "serving": 1 porcja, 2–4 porcje, 5+ and fractions porcji. */
function servingsUnit(n: number): string {
    if (n === 1) return 'porcja';
    if (Number.isInteger(n) && n >= 2 && n <= 4) return 'porcje';
    return 'porcji';
}
