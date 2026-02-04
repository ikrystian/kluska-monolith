import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { DietPlan } from '@/models/DietPlan';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const plan = await DietPlan.findById(params.id).lean();

        if (!plan) {
            return NextResponse.json({ error: 'Diet Plan not found' }, { status: 404 });
        }

        return NextResponse.json(plan);

    } catch (error) {
        console.error('Error fetching diet plan:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const data = await request.json();

        const updatedPlan = await DietPlan.findByIdAndUpdate(
            params.id,
            { $set: data },
            { new: true, runValidators: true }
        );

        if (!updatedPlan) {
            return NextResponse.json({ error: 'Diet Plan not found' }, { status: 404 });
        }

        return NextResponse.json(updatedPlan);

    } catch (error) {
        console.error('Error updating diet plan:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const deletedPlan = await DietPlan.findByIdAndDelete(params.id);

        if (!deletedPlan) {
            return NextResponse.json({ error: 'Diet Plan not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Diet Plan deleted successfully' });

    } catch (error) {
        console.error('Error deleting diet plan:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
