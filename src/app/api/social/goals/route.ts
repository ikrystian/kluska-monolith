import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { getFriendIds, getUserSummaries } from '@/lib/friends';
import { Goal } from '@/models';

// Matches the window the friends feed advertises for its other entries.
const DEFAULT_DAYS = 14;
const MAX_ITEMS = 50;

// GET - Goals set recently by the caller and their accepted friends, newest first.
// Only what the feed shows (title, progress, deadline) is returned — not the
// goal's description or any trainer/gamification fields.
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(Number(searchParams.get('days')) || DEFAULT_DAYS, 1), 60);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || MAX_ITEMS, 1), 100);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    await connectToDatabase();

    const friendIds = await getFriendIds(user.id);
    const ownerIds = [user.id, ...friendIds];

    const [goals, summaries] = await Promise.all([
      Goal.find({ ownerId: { $in: ownerIds }, status: { $ne: 'cancelled' }, createdAt: { $gte: since } })
        .select('ownerId title target current unit deadline createdAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      getUserSummaries(ownerIds),
    ]);

    const data = goals
      .filter(goal => summaries.has(goal.ownerId))
      .map(goal => ({
        id: String(goal._id),
        ownerId: goal.ownerId,
        title: goal.title,
        target: goal.target,
        current: goal.current,
        unit: goal.unit,
        deadline: goal.deadline,
        createdAt: goal.createdAt,
        author: summaries.get(goal.ownerId),
      }));

    return NextResponse.json({ data, meta: { friendsCount: friendIds.length } });
  } catch (error) {
    console.error('GET /api/social/goals error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
