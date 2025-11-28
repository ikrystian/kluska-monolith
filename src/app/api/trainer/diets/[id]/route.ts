import { NextRequest, NextResponse } from 'next/server';
import { DietPlan } from '@/models/DietPlan';
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
        const plan = await DietPlan.findOne({ _id: params.id, trainerId: session.user.id });

        if (!plan) {
            return NextResponse.json({ error: 'Diet plan not found' }, { status: 404 });
        }

        return NextResponse.json({ plan });
    } catch (error) {
        console.error('Error fetching diet plan:', error);
        return NextResponse.json({ error: 'Failed to fetch diet plan' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || session.user.role !== 'trainer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, description, days } = body;

        await connectToDatabase();
        const updatedPlan = await DietPlan.findOneAndUpdate(
            { _id: params.id, trainerId: session.user.id },
            {
                name,
                description,
                days,
            },
            { new: true }
        );

        if (!updatedPlan) {
            return NextResponse.json({ error: 'Diet plan not found' }, { status: 404 });
        }

        return NextResponse.json({ plan: updatedPlan });
    } catch (error) {
        console.error('Error updating diet plan:', error);
        return NextResponse.json({ error: 'Failed to update diet plan' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || session.user.role !== 'trainer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const deletedPlan = await DietPlan.findOneAndDelete({ _id: params.id, trainerId: session.user.id });

        if (!deletedPlan) {
            return NextResponse.json({ error: 'Diet plan not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Diet plan deleted successfully' });
    } catch (error) {
        console.error('Error deleting diet plan:', error);
        return NextResponse.json({ error: 'Failed to delete diet plan' }, { status: 500 });
    }
}
