import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { PushSubscription } from '@/models/PushSubscription';
import { User } from '@/models/User';

// GET - admin-only: users who have at least one active push subscription
// (i.e. enabled the "powiadomienia push" toggle and the browser accepted it).
export async function GET(request: NextRequest) {
  try {
    const requester = await getRequestUser(request);
    if (!requester) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (requester.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();

    const grouped = await PushSubscription.aggregate([
      {
        $group: {
          _id: '$userId',
          deviceCount: { $sum: 1 },
          lastSubscribedAt: { $max: '$updatedAt' },
          platforms: { $addToSet: '$platform' },
        },
      },
    ]);

    const userIds = grouped.map((g) => g._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email role')
      .lean();
    const userById = new Map(users.map((u) => [u._id.toString(), u]));

    const eligibleUsers = grouped
      .map((g) => {
        const u = userById.get(g._id);
        if (!u) return null;
        return {
          id: g._id,
          name: u.name,
          email: u.email,
          role: u.role,
          deviceCount: g.deviceCount,
          lastSubscribedAt: g.lastSubscribedAt,
          platforms: g.platforms,
        };
      })
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ data: eligibleUsers });
  } catch (error) {
    console.error('Error listing push-eligible users:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}
