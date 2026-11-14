import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { isValidObjectId } from 'mongoose';
import { DietPlan } from '@/models/DietPlan';

// W Next 16 `params` handlera jest Promise i trzeba go rozpakować przez `await`.
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
    request: Request,
    { params }: RouteContext
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        if (!isValidObjectId(id)) {
            return NextResponse.json({ error: 'Diet Plan not found' }, { status: 404 });
        }

        await dbConnect();
        const plan = await DietPlan.findById(id).lean();

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
    { params }: RouteContext
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        if (!isValidObjectId(id)) {
            return NextResponse.json({ error: 'Diet Plan not found' }, { status: 404 });
        }

        await dbConnect();
        const data = await request.json();

        const updatedPlan = await DietPlan.findByIdAndUpdate(
            id,
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
    { params }: RouteContext
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        if (!isValidObjectId(id)) {
            return NextResponse.json({ error: 'Diet Plan not found' }, { status: 404 });
        }

        await dbConnect();
        const deletedPlan = await DietPlan.findByIdAndDelete(id);

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
