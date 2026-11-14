import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { FoodDiaryEntry } from '@/models/FoodDiaryEntry';
import { DIARY_MEAL_TYPES, isDiaryDate } from '@/lib/food-diary';

/** A day rarely has more than a dozen entries; the cap only stops a runaway request. */
const MAX_COPIED_ENTRIES = 60;

// POST /api/athlete/nutrition/diary/copy
// Body: { fromDate, toDate, mealType? } — repeats the athlete's own entries of
// one day (or one meal of that day) on another day, e.g. "same breakfast as yesterday".
export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fromDate, toDate, mealType } = await request.json();
        if (!isDiaryDate(fromDate) || !isDiaryDate(toDate) || fromDate === toDate) {
            return NextResponse.json({ error: 'Two different valid dates (YYYY-MM-DD) are required' }, { status: 400 });
        }
        if (mealType !== undefined && !DIARY_MEAL_TYPES.includes(mealType)) {
            return NextResponse.json({ error: 'Invalid meal type' }, { status: 400 });
        }

        await connectToDatabase();

        const source = await FoodDiaryEntry.find({ ownerId: user.id, date: fromDate, ...(mealType ? { mealType } : {}) })
            .sort({ createdAt: 1 })
            .limit(MAX_COPIED_ENTRIES)
            .lean();
        if (source.length === 0) {
            return NextResponse.json({ error: 'Nothing to copy' }, { status: 404 });
        }

        // Spread the timestamps a millisecond apart so the copies keep the order of the originals.
        const now = Date.now();
        const created = await FoodDiaryEntry.insertMany(
            source.map((entry, index) => ({
                ownerId: user.id,
                date: toDate,
                mealType: entry.mealType,
                name: entry.name,
                amount: entry.amount,
                unit: entry.unit,
                calories: entry.calories,
                protein: entry.protein,
                carbs: entry.carbs,
                fat: entry.fat,
                productId: entry.productId,
                barcode: entry.barcode,
                source: entry.source,
                createdAt: new Date(now + index),
                updatedAt: new Date(now + index),
            }))
        );

        return NextResponse.json({ entries: created.map((entry) => entry.toJSON()), count: created.length }, { status: 201 });
    } catch (error) {
        console.error('Error copying food diary entries:', error);
        return NextResponse.json({ error: 'Failed to copy diary entries' }, { status: 500 });
    }
}
