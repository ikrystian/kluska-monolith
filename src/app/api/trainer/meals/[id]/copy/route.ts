import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { SavedMeal } from '@/models/SavedMeal';

// POST /api/trainer/meals/:id/copy — private, editable copy of a public catalogue meal.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'trainer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        await connectToDatabase();
        const source = await SavedMeal.findOne({ _id: id, isPublic: true }).lean();
        if (!source) {
            return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
        }

        const { _id, createdAt, updatedAt, __v, ...rest } = source as any;
        const copy = await SavedMeal.create({
            ...rest,
            ingredients: rest.ingredients.map(({ _id: ingredientId, ...ingredient }: any) => ingredient),
            trainerId: session.user.id,
            isPublic: false,
        });

        return NextResponse.json({ meal: copy }, { status: 201 });
    } catch (error) {
        console.error('Error copying meal:', error);
        return NextResponse.json({ error: 'Failed to copy meal' }, { status: 500 });
    }
}
