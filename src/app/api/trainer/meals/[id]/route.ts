import { NextRequest, NextResponse } from 'next/server';
import { SavedMeal } from '@/models/SavedMeal';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { parseSavedMealPayload } from '@/lib/saved-meal-payload';

type RouteContext = { params: Promise<{ id: string }> };

async function requireTrainer() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'trainer') return null;
    return session.user;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
    try {
        const user = await requireTrainer();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        await connectToDatabase();
        const meal = await SavedMeal.findOne({ _id: id, trainerId: user.id });

        if (!meal) {
            return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
        }

        return NextResponse.json({ meal });
    } catch (error) {
        console.error('Error fetching meal:', error);
        return NextResponse.json({ error: 'Failed to fetch meal' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
    try {
        const user = await requireTrainer();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const parsed = parseSavedMealPayload(await req.json());
        if ('error' in parsed) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        const { id } = await params;
        await connectToDatabase();
        const updatedMeal = await SavedMeal.findOneAndUpdate(
            { _id: id, trainerId: user.id },
            parsed.data,
            { new: true, runValidators: true }
        );

        if (!updatedMeal) {
            return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
        }

        return NextResponse.json({ meal: updatedMeal });
    } catch (error) {
        console.error('Error updating meal:', error);
        return NextResponse.json({ error: 'Failed to update meal' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
    try {
        const user = await requireTrainer();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        await connectToDatabase();
        const deletedMeal = await SavedMeal.findOneAndDelete({ _id: id, trainerId: user.id });

        if (!deletedMeal) {
            return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Meal deleted successfully' });
    } catch (error) {
        console.error('Error deleting meal:', error);
        return NextResponse.json({ error: 'Failed to delete meal' }, { status: 500 });
    }
}
