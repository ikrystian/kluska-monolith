import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { SavedMeal } from '@/models/SavedMeal';
import { User } from '@/models/User';
import { diacriticInsensitivePattern, isDishCategory, SYSTEM_MEAL_OWNER } from '@/lib/meal-catalog';
import { parseSavedMealPayload } from '@/lib/saved-meal-payload';

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    return session?.user?.role === 'admin' ? session.user : null;
}

// GET /api/admin/meals?search=&dishCategory=&visibility=public|private&page=&limit=
export async function GET(request: NextRequest) {
    try {
        if (!(await requireAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = request.nextUrl.searchParams;
        const search = params.get('search')?.trim() ?? '';
        const dishCategory = params.get('dishCategory');
        const visibility = params.get('visibility');
        const page = Math.max(1, parseInt(params.get('page') || '1') || 1);
        const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '25') || 25));

        const query: Record<string, unknown> = {};
        if (search) query.name = { $regex: diacriticInsensitivePattern(search), $options: 'i' };
        if (isDishCategory(dishCategory)) query.dishCategory = dishCategory;
        if (visibility === 'public') query.isPublic = true;
        if (visibility === 'private') query.isPublic = { $ne: true };

        await connectToDatabase();
        const [meals, total] = await Promise.all([
            SavedMeal.find(query)
                .sort({ dishCategory: 1, name: 1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            SavedMeal.countDocuments(query),
        ]);

        const ownerIds = [...new Set(meals.map((m) => m.trainerId).filter((id) => id !== SYSTEM_MEAL_OWNER))];
        const owners = ownerIds.length
            ? await User.find({ _id: { $in: ownerIds.filter((id) => /^[a-f\d]{24}$/i.test(id)) } }, { name: 1 }).lean()
            : [];
        const ownerNames = new Map(owners.map((o: any) => [o._id.toString(), o.name as string]));

        return NextResponse.json({
            meals: meals.map((m: any) => ({
                ...m,
                _id: m._id.toString(),
                ownerName: m.trainerId === SYSTEM_MEAL_OWNER ? 'System' : ownerNames.get(m.trainerId) ?? 'Nieznany',
            })),
            pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
        });
    } catch (error) {
        console.error('Error fetching admin meals:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        if (!(await requireAdmin())) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const parsed = parseSavedMealPayload(await request.json());
        if ('error' in parsed) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        await connectToDatabase();
        // Catalogue meals created by an admin belong to the system, not to the admin account.
        const meal = await SavedMeal.create({ ...parsed.data, trainerId: SYSTEM_MEAL_OWNER });
        return NextResponse.json({ meal }, { status: 201 });
    } catch (error) {
        console.error('Error creating admin meal:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
