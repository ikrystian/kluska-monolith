import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { DietPlan } from '@/models/DietPlan';
import { SavedMeal } from '@/models/SavedMeal';

// GET - The athlete's assigned diet plan with SavedMeal details embedded
export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const athlete = await User.findById(user.id);
        if (!athlete) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!athlete.assignedDietPlanId) {
            return NextResponse.json({ diet: null });
        }

        const diet = await DietPlan.findById(athlete.assignedDietPlanId);
        if (!diet) {
            // Stale reference (plan deleted by the trainer) — treat as unassigned
            return NextResponse.json({ diet: null });
        }

        const savedMealIds = [
            ...new Set(diet.days.flatMap((day) => day.meals.map((meal) => meal.savedMealId))),
        ];
        const savedMeals = await SavedMeal.find({ _id: { $in: savedMealIds } });
        const mealMap = new Map(savedMeals.map((meal) => [String(meal._id), meal.toJSON()]));

        const days = diet.days.map((day) => ({
            dayNumber: day.dayNumber,
            meals: day.meals.map((meal) => ({
                type: meal.type,
                time: meal.time,
                meal: mealMap.get(meal.savedMealId) ?? null,
            })),
        }));

        return NextResponse.json({
            diet: {
                id: String(diet._id),
                name: diet.name,
                description: diet.description,
                days,
                updatedAt: diet.updatedAt,
            },
        });
    } catch (error) {
        console.error('Error fetching athlete diet:', error);
        return NextResponse.json({ error: 'Failed to fetch diet' }, { status: 500 });
    }
}
