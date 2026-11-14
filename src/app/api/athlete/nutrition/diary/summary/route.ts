import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { FoodDiaryEntry } from '@/models/FoodDiaryEntry';
import { isDiaryDate } from '@/lib/food-diary';

const MAX_RANGE_DAYS = 62;

// GET /api/athlete/nutrition/diary/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// Per-day totals for a range of days (only days with entries are returned) —
// feeds the week strip above the diary.
export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const from = request.nextUrl.searchParams.get('from');
        const to = request.nextUrl.searchParams.get('to');
        if (!isDiaryDate(from) || !isDiaryDate(to) || from > to) {
            return NextResponse.json({ error: 'Valid from/to dates (YYYY-MM-DD) are required' }, { status: 400 });
        }
        const rangeDays = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
        if (rangeDays > MAX_RANGE_DAYS) {
            return NextResponse.json({ error: `Range is limited to ${MAX_RANGE_DAYS} days` }, { status: 400 });
        }

        await connectToDatabase();

        const rows = await FoodDiaryEntry.aggregate<{ _id: string; calories: number; protein: number; carbs: number; fat: number; entries: number }>([
            { $match: { ownerId: user.id, date: { $gte: from, $lte: to } } },
            {
                $group: {
                    _id: '$date',
                    calories: { $sum: '$calories' },
                    protein: { $sum: '$protein' },
                    carbs: { $sum: '$carbs' },
                    fat: { $sum: '$fat' },
                    entries: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const round1 = (n: number) => Math.round(n * 10) / 10;
        return NextResponse.json({
            days: rows.map((row) => ({
                date: row._id,
                calories: Math.round(row.calories),
                protein: round1(row.protein),
                carbs: round1(row.carbs),
                fat: round1(row.fat),
                entries: row.entries,
            })),
        });
    } catch (error) {
        console.error('Error fetching food diary summary:', error);
        return NextResponse.json({ error: 'Failed to fetch diary summary' }, { status: 500 });
    }
}
