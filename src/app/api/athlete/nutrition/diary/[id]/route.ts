import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { FoodDiaryEntry } from '@/models/FoodDiaryEntry';

// DELETE /api/athlete/nutrition/diary/[id] — removes the athlete's own entry
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const deleted = await FoodDiaryEntry.findOneAndDelete({ _id: params.id, ownerId: user.id });
        if (!deleted) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting food diary entry:', error);
        return NextResponse.json({ error: 'Failed to delete diary entry' }, { status: 500 });
    }
}

// PATCH /api/athlete/nutrition/diary/[id] — updates the eaten amount, rescaling macros
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const newAmount = Number(body.amount);
        if (!Number.isFinite(newAmount) || newAmount <= 0 || newAmount > 5000) {
            return NextResponse.json({ error: 'Amount must be between 0 and 5000 g' }, { status: 400 });
        }

        await connectToDatabase();

        const entry = await FoodDiaryEntry.findOne({ _id: params.id, ownerId: user.id });
        if (!entry) {
            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
        }

        const factor = newAmount / entry.amount;
        const round1 = (n: number) => Math.round(n * 10) / 10;

        entry.calories = Math.round(entry.calories * factor);
        entry.protein = round1(entry.protein * factor);
        entry.carbs = round1(entry.carbs * factor);
        entry.fat = round1(entry.fat * factor);
        entry.amount = newAmount;
        await entry.save();

        return NextResponse.json({ entry: entry.toJSON() });
    } catch (error) {
        console.error('Error updating food diary entry:', error);
        return NextResponse.json({ error: 'Failed to update diary entry' }, { status: 500 });
    }
}
