import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { DietPlan } from '@/models/DietPlan';
import { SavedMeal } from '@/models/SavedMeal';
import DietPlanForm from '@/components/trainer/DietPlanForm';
import { redirect, notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getDietPlan(id: string, trainerId: string) {
    await connectToDatabase();
    try {
        const plan = await DietPlan.findOne({ _id: id, trainerId }).lean();
        if (!plan) return null;

        // Collect all meal IDs
        const mealIds = new Set<string>();
        if (plan.days) {
            plan.days.forEach((day: any) => {
                if (day.meals) {
                    day.meals.forEach((meal: any) => {
                        if (meal.savedMealId) mealIds.add(meal.savedMealId);
                    });
                }
            });
        }

        // Fetch meals
        const meals = await SavedMeal.find({ _id: { $in: Array.from(mealIds) } }).lean();
        const mealsMap = new Map(meals.map((m: any) => [m._id.toString(), m]));

        // Enrich plan
        const enrichedPlan = {
            ...plan,
            _id: plan._id.toString(),
            days: plan.days ? plan.days.map((day: any) => ({
                ...day,
                meals: day.meals ? day.meals.map((meal: any) => {
                    const savedMeal = mealsMap.get(meal.savedMealId);
                    return {
                        ...meal,
                        mealName: savedMeal?.name || 'Nieznany posiłek',
                        macros: savedMeal ? {
                            calories: savedMeal.totalCalories,
                            protein: savedMeal.totalProtein,
                            carbs: savedMeal.totalCarbs,
                            fat: savedMeal.totalFat,
                        } : { calories: 0, protein: 0, carbs: 0, fat: 0 }
                    };
                }) : []
            })) : []
        };

        return JSON.parse(JSON.stringify(enrichedPlan));
    } catch (error) {
        console.error('Error fetching diet plan:', error);
        return null;
    }
}

export default async function EditDietPlanPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'trainer') {
        redirect('/auth/signin');
    }

    const plan = await getDietPlan(params.id, session.user.id);

    if (!plan) {
        notFound();
    }

    return (
        <div className="container mx-auto p-6">
            <DietPlanForm initialData={plan} />
        </div>
    );
}
