import { NextRequest, NextResponse } from 'next/server';
import { SavedMeal } from '@/models/SavedMeal';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || session.user.role !== 'trainer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const meal = await SavedMeal.findOne({ _id: params.id, trainerId: session.user.id });

        if (!meal) {
            return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
        }

        return NextResponse.json({ meal });
    } catch (error) {
        console.error('Error fetching meal:', error);
        return NextResponse.json({ error: 'Failed to fetch meal' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || session.user.role !== 'trainer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, ingredients, totalCalories, totalProtein, totalCarbs, totalFat } = body;

        await connectToDatabase();
        const updatedMeal = await SavedMeal.findOneAndUpdate(
            { _id: params.id, trainerId: session.user.id },
            {
                name,
                ingredients,
                totalCalories,
                totalProtein,
                totalCarbs,
                totalFat,
            },
            { new: true }
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || session.user.role !== 'trainer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const deletedMeal = await SavedMeal.findOneAndDelete({ _id: params.id, trainerId: session.user.id });

        if (!deletedMeal) {
            return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Meal deleted successfully' });
    } catch (error) {
        console.error('Error deleting meal:', error);
        return NextResponse.json({ error: 'Failed to delete meal' }, { status: 500 });
    }
}
