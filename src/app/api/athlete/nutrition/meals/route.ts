import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { SavedMeal } from '@/models/SavedMeal';
import { User } from '@/models/User';
import { diacriticInsensitivePattern, isDishCategory, visibleMealsFilter } from '@/lib/meal-catalog';

// GET /api/athlete/nutrition/meals?query=&category=
// Ready-made dishes the athlete can log in one tap: public catalogue meals
// plus private meals prepared by their trainer.
export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';
        const category = request.nextUrl.searchParams.get('category');

        await connectToDatabase();
        const profile = await User.findById(user.id, { trainerId: 1 }).lean().catch(() => null);
        const trainerId = (profile as { trainerId?: string } | null)?.trainerId ?? null;

        const filter: Record<string, unknown> = { ...visibleMealsFilter(user.id, trainerId) };
        if (query) filter.name = { $regex: diacriticInsensitivePattern(query), $options: 'i' };
        if (isDishCategory(category)) filter.dishCategory = category;

        const meals = await SavedMeal.find(filter)
            .sort({ name: 1 })
            .limit(60)
            .lean();

        return NextResponse.json({
            meals: meals.map((meal: any) => ({
                id: meal._id.toString(),
                name: meal.name,
                description: meal.description,
                mealType: meal.category,
                dishCategory: meal.dishCategory ?? 'other',
                calories: meal.totalCalories,
                protein: meal.totalProtein,
                carbs: meal.totalCarbs,
                fat: meal.totalFat,
                ingredients: (meal.ingredients ?? []).map((i: any) => ({
                    name: i.name,
                    amount: i.amount,
                    unit: i.unit,
                })),
                fromTrainer: Boolean(trainerId) && meal.trainerId === trainerId,
            })),
        });
    } catch (error) {
        console.error('Error searching meals:', error);
        return NextResponse.json({ error: 'Failed to search meals' }, { status: 500 });
    }
}
