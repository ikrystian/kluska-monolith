import { NextRequest, NextResponse } from 'next/server';
import { SavedMeal } from '@/models/SavedMeal';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || session.user.role !== 'trainer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const meals = await SavedMeal.find({ trainerId: session.user.id }).sort({ createdAt: -1 });
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

        const body = await req.json();
        const { name, ingredients, totalCalories, totalProtein, totalCarbs, totalFat } = body;

        if (!name || !ingredients || ingredients.length === 0) {
            return NextResponse.json({ error: 'Invalid meal data' }, { status: 400 });
        }

        await connectToDatabase();
        const newMeal = await SavedMeal.create({
            name,
            trainerId: session.user.id,
            ingredients,
            totalCalories,
            totalProtein,
            totalCarbs,
            totalFat,
        });

        return NextResponse.json({ meal: newMeal }, { status: 201 });
    } catch (error) {
        console.error('Error creating meal:', error);
        return NextResponse.json({ error: 'Failed to create meal' }, { status: 500 });
    }
}
