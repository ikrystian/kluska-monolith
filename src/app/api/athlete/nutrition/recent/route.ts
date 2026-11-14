import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { FoodDiaryEntry } from '@/models/FoodDiaryEntry';
import { escapeRegex } from '@/lib/food-diary';

// GET /api/athlete/nutrition/recent[?query=...]
// Foods the athlete logged in the last 30 days, one row per name (latest
// amount wins), most frequent first — for one-tap re-logging. With `query` it
// searches the names of everything logged in the last year instead.
export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const query = request.nextUrl.searchParams.get('query')?.trim().slice(0, 80) ?? '';

        await connectToDatabase();
        const since = new Date(Date.now() - (query ? 365 : 30) * 24 * 60 * 60 * 1000);

        const rows = await FoodDiaryEntry.aggregate([
            {
                $match: {
                    ownerId: user.id,
                    createdAt: { $gte: since },
                    ...(query ? { name: { $regex: escapeRegex(query), $options: 'i' } } : {}),
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: { $toLower: '$name' },
                    latest: { $first: '$$ROOT' },
                    count: { $sum: 1 },
                    lastUsed: { $first: '$createdAt' },
                },
            },
            { $sort: { count: -1, lastUsed: -1 } },
            { $limit: query ? 6 : 12 },
        ]);

        return NextResponse.json({
            foods: rows.map(({ latest, count }) => ({
                name: latest.name,
                amount: latest.amount,
                unit: latest.unit,
                calories: latest.calories,
                protein: latest.protein,
                carbs: latest.carbs,
                fat: latest.fat,
                source: latest.source,
                productId: latest.productId,
                barcode: latest.barcode,
                count,
            })),
        });
    } catch (error) {
        console.error('Error fetching recent foods:', error);
        return NextResponse.json({ error: 'Failed to fetch recent foods' }, { status: 500 });
    }
}
