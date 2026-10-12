import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserSummaries, type FriendRelation } from '@/lib/friends';
import { Friendship, User } from '@/models';

const MAX_ATHLETES = 300;

function normalizeLocation(location?: string | null): string {
  return (location || '').trim().toLocaleLowerCase('pl');
}

// GET - Athletes "in your area": every registered athlete, with the caller's
// friendship status for each. Athletes from the caller's own location come first.
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const [me, athletes, friendships] = await Promise.all([
      User.findById(user.id).select('location').lean(),
      User.find({ role: 'athlete', isGuest: { $ne: true }, _id: { $ne: user.id } })
        .select('_id')
        .sort({ createdAt: -1 })
        .limit(MAX_ATHLETES)
        .lean(),
      Friendship.find({ $or: [{ requesterId: user.id }, { recipientId: user.id }] }).lean(),
    ]);

    const summaries = await getUserSummaries(athletes.map(a => String(a._id)));

    const relationByUser = new Map<string, { relation: FriendRelation; friendshipId: string }>();
    for (const f of friendships) {
      const otherId = f.requesterId === user.id ? f.recipientId : f.requesterId;
      const relation: FriendRelation =
        f.status === 'accepted' ? 'friends' : f.requesterId === user.id ? 'outgoing' : 'incoming';
      relationByUser.set(otherId, { relation, friendshipId: String(f._id) });
    }

    const myLocation = normalizeLocation(me?.location);

    const data = [...summaries.values()]
      .map(summary => ({
        ...summary,
        sameArea: Boolean(myLocation) && normalizeLocation(summary.location) === myLocation,
        relation: relationByUser.get(summary.userId)?.relation ?? 'none',
        friendshipId: relationByUser.get(summary.userId)?.friendshipId,
      }))
      .sort(
        (a, b) =>
          Number(b.sameArea) - Number(a.sameArea) ||
          Number(Boolean(b.nickname)) - Number(Boolean(a.nickname)) ||
          a.displayName.localeCompare(b.displayName, 'pl')
      );

    return NextResponse.json({ data, meta: { myLocation: me?.location || null } });
  } catch (error) {
    console.error('GET /api/social/athletes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
