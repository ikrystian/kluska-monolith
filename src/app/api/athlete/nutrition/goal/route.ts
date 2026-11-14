import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { NutritionGoal } from '@/models/NutritionGoal';

// PUT /api/athlete/nutrition/goal
// Body: { dailyCalories, dailyProtein, dailyCarbs, dailyFat } — the athlete
// sets their own daily target. The previous active goal (their own or one set
// by a trainer) is closed rather than overwritten, so the history stays.
export async function PUT(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const whole = (value: unknown, min: number, max: number): number | null => {
            const n = Number(value);
            return value !== null && value !== '' && Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
        };
        const dailyCalories = whole(body.dailyCalories, 800, 10000);
        const dailyProtein = whole(body.dailyProtein, 0, 1000);
        const dailyCarbs = whole(body.dailyCarbs, 0, 2000);
        const dailyFat = whole(body.dailyFat, 0, 1000);
        if (dailyCalories === null) {
            return NextResponse.json({ error: 'Daily calories must be between 800 and 10000' }, { status: 400 });
        }
        if (dailyProtein === null || dailyCarbs === null || dailyFat === null) {
            return NextResponse.json({ error: 'Invalid macro targets' }, { status: 400 });
        }

        await connectToDatabase();

        const now = new Date();
        await NutritionGoal.updateMany({ ownerId: user.id, isActive: true }, { $set: { isActive: false, endDate: now } });
        const goal = await NutritionGoal.create({
            ownerId: user.id,
            dailyCalories,
            dailyProtein,
            dailyCarbs,
            dailyFat,
            startDate: now,
            isActive: true,
        });

        return NextResponse.json({
            goal: {
                dailyCalories: goal.dailyCalories,
                dailyProtein: goal.dailyProtein,
                dailyCarbs: goal.dailyCarbs,
                dailyFat: goal.dailyFat,
                setByTrainer: false,
            },
        });
    } catch (error) {
        console.error('Error saving nutrition goal:', error);
        return NextResponse.json({ error: 'Failed to save nutrition goal' }, { status: 500 });
    }
}
