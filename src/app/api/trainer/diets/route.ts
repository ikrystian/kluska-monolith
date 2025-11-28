import { NextRequest, NextResponse } from 'next/server';
import { DietPlan } from '@/models/DietPlan';
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
        const diets = await DietPlan.find({ trainerId: session.user.id }).sort({ createdAt: -1 });
        return NextResponse.json({ diets });
    } catch (error) {
        console.error('Error fetching diets:', error);
        return NextResponse.json({ error: 'Failed to fetch diets' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || session.user.role !== 'trainer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, description, days } = body;

        if (!name || !days || days.length === 0) {
            return NextResponse.json({ error: 'Invalid diet data' }, { status: 400 });
        }

        await connectToDatabase();
        const newDiet = await DietPlan.create({
            name,
            trainerId: session.user.id,
            description,
            days,
        });

        return NextResponse.json({ diet: newDiet }, { status: 201 });
    } catch (error) {
        console.error('Error creating diet:', error);
        return NextResponse.json({ error: 'Failed to create diet' }, { status: 500 });
    }
}
