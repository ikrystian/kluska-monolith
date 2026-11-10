import { NextRequest, NextResponse } from 'next/server';
import { SavedMeal } from '@/models/SavedMeal';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { parseSavedMealPayload } from '@/lib/saved-meal-payload';

// GET /api/trainer/meals[?include=public] — own meals, optionally plus the public catalogue.
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || session.user.role !== 'trainer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const includePublic = req.nextUrl.searchParams.get('include') === 'public';
        const filter = includePublic
            ? { $or: [{ trainerId: session.user.id }, { isPublic: true }] }
            : { trainerId: session.user.id };
        const meals = await SavedMeal.find(filter).sort({ createdAt: -1 });
        return NextResponse.json({ meals });
    } catch (error) {
        console.error('Error fetching meals:', error);
        return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || session.user.role !== 'trainer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const parsed = parseSavedMealPayload(await req.json());
        if ('error' in parsed) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        await connectToDatabase();
        const newMeal = await SavedMeal.create({ ...parsed.data, trainerId: session.user.id });

        return NextResponse.json({ meal: newMeal }, { status: 201 });
    } catch (error) {
        console.error('Error creating meal:', error);
        return NextResponse.json({ error: 'Failed to create meal' }, { status: 500 });
    }
}
