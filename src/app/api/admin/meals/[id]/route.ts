import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { SavedMeal } from '@/models/SavedMeal';
import { parseSavedMealPayload } from '@/lib/saved-meal-payload';

type RouteContext = { params: Promise<{ id: string }> };

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    return session?.user?.role === 'admin' ? session.user : null;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
    try {
        if (!(await requireAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { id } = await params;
        await connectToDatabase();
        const meal = await SavedMeal.findById(id);
        if (!meal) return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
        return NextResponse.json({ meal });
    } catch (error) {
        console.error('Error fetching admin meal:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT accepts either a full meal body or just `{ isPublic }` for the list toggle.
export async function PUT(request: NextRequest, { params }: RouteContext) {
    try {
        if (!(await requireAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { id } = await params;
        const body = await request.json();

        let update: Record<string, unknown>;
        if (Object.keys(body ?? {}).length === 1 && typeof body.isPublic === 'boolean') {
            update = { isPublic: body.isPublic };
        } else {
            const parsed = parseSavedMealPayload(body);
            if ('error' in parsed) {
                return NextResponse.json({ error: parsed.error }, { status: 400 });
            }
            update = { ...parsed.data };
        }

        await connectToDatabase();
        const meal = await SavedMeal.findByIdAndUpdate(id, update, { new: true, runValidators: true });
        if (!meal) return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
        return NextResponse.json({ meal });
    } catch (error) {
        console.error('Error updating admin meal:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
    try {
        if (!(await requireAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { id } = await params;
        await connectToDatabase();
        const meal = await SavedMeal.findByIdAndDelete(id);
        if (!meal) return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
        return NextResponse.json({ message: 'Meal deleted' });
    } catch (error) {
        console.error('Error deleting admin meal:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
