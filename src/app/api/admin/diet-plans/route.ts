import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { DietPlan } from '@/models/DietPlan';
import { User } from '@/models/User';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const query: any = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const [plans, total] = await Promise.all([
            DietPlan.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            DietPlan.countDocuments(query)
        ]);

        // Enhance plans with trainer names if possible/needed, but strict typing might be an issue
        // For now returning basic plan data

        return NextResponse.json({
            plans,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching diet plans:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const data = await request.json();

        // Required fields validation handled by Mongoose usually, but good to check specifics
        if (!data.name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Assign current admin as the creator/trainerId if not provided (though admin edits might want to assign specific trainer?)
        // usage: trainerId is required.
        const planData = {
            ...data,
            trainerId: session.user.id // Admin owns the plan
        };

        const newPlan = await DietPlan.create(planData);

        return NextResponse.json(newPlan, { status: 201 });

    } catch (error) {
        console.error('Error creating diet plan:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
