import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { FoodDiaryEntry } from '@/models/FoodDiaryEntry';
import { NutritionGoal } from '@/models/NutritionGoal';

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
