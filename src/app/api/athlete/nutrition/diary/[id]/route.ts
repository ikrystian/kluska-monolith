import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { FoodDiaryEntry } from '@/models/FoodDiaryEntry';
import { DIARY_MEAL_TYPES, isServingsUnit, servingsUnit } from '@/lib/food-diary';

// DELETE /api/athlete/nutrition/diary/[id] — removes the athlete's own entry
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        if (!/^[a-f\d]{24}$/i.test(id)) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        await connectToDatabase();

        const deleted = await FoodDiaryEntry.findOneAndDelete({ _id: id, ownerId: user.id });
        if (!deleted) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting food diary entry:', error);
        return NextResponse.json({ error: 'Failed to delete diary entry' }, { status: 500 });
    }
}

// PATCH /api/athlete/nutrition/diary/[id]
// Body: { amount?, mealType? } — a new eaten amount rescales the macros, a new
// meal type moves the entry to another section of the same day.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const hasAmount = body.amount !== undefined;
        const hasMealType = body.mealType !== undefined;
        if (!hasAmount && !hasMealType) {
            return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
        }
        if (hasMealType && !DIARY_MEAL_TYPES.includes(body.mealType)) {
            return NextResponse.json({ error: 'Invalid meal type' }, { status: 400 });
        }

        const { id } = await params;
        if (!/^[a-f\d]{24}$/i.test(id)) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        await connectToDatabase();

        const entry = await FoodDiaryEntry.findOne({ _id: id, ownerId: user.id });
        if (!entry) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        if (hasAmount) {
            const servings = isServingsUnit(entry.unit);
            const newAmount = Number(body.amount);
            if (!Number.isFinite(newAmount) || newAmount <= 0 || newAmount > (servings ? 10 : 5000)) {
                return NextResponse.json({ error: servings ? 'Servings must be between 0 and 10' : 'Amount must be between 0 and 5000 g' }, { status: 400 });
            }

            const factor = newAmount / entry.amount;
            const round1 = (n: number) => Math.round(n * 10) / 10;

            entry.calories = Math.round(entry.calories * factor);
            entry.protein = round1(entry.protein * factor);
            entry.carbs = round1(entry.carbs * factor);
            entry.fat = round1(entry.fat * factor);
            entry.amount = newAmount;
            if (servings) entry.unit = servingsUnit(newAmount);
        }
        if (hasMealType) entry.mealType = body.mealType;
        await entry.save();

        return NextResponse.json({ entry: entry.toJSON() });
    } catch (error) {
        console.error('Error updating food diary entry:', error);
        return NextResponse.json({ error: 'Failed to update diary entry' }, { status: 500 });
    }
}
