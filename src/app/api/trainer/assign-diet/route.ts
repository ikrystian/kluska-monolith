import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models/User';
import { DietPlan } from '@/models/DietPlan';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || session.user.role !== 'trainer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { athleteId, dietPlanId } = body;

        if (!athleteId) {
            return NextResponse.json({ error: 'Athlete ID is required' }, { status: 400 });
        }

        await connectToDatabase();

        // Verify the athlete belongs to the trainer (optional but recommended)
        const athlete = await User.findOne({ _id: athleteId, trainerId: session.user.id });
        if (!athlete) {
            return NextResponse.json({ error: 'Athlete not found or not assigned to you' }, { status: 404 });
        }

        // Verify the diet plan exists and belongs to the trainer
        if (dietPlanId) {
            const diet = await DietPlan.findOne({ _id: dietPlanId, trainerId: session.user.id });
            if (!diet) {
                return NextResponse.json({ error: 'Diet plan not found' }, { status: 404 });
            }
        }

        // Update the athlete's assigned diet
        athlete.assignedDietPlanId = dietPlanId || null; // Allow unassigning by passing null
        await athlete.save();

        return NextResponse.json({ message: 'Diet assigned successfully', athlete });
    } catch (error) {
        console.error('Error assigning diet:', error);
        return NextResponse.json({ error: 'Failed to assign diet' }, { status: 500 });
    }
}
