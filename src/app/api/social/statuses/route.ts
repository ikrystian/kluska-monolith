import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { getFriendIds, getUserSummaries } from '@/lib/friends';
import { SocialStatus } from '@/models';

const MAX_STATUS_LENGTH = 280;

// GET - Friends wall: statuses of the caller and their accepted friends, newest first
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 100);

    await connectToDatabase();

    const friendIds = await getFriendIds(user.id);
    const authorIds = [user.id, ...friendIds];

    const [statuses, summaries] = await Promise.all([
      SocialStatus.find({ authorId: { $in: authorIds } }).sort({ createdAt: -1 }).limit(limit),
      getUserSummaries(authorIds),
    ]);

    const data = statuses
      .filter(s => summaries.has(s.authorId))
      .map(s => ({ ...s.toJSON(), author: summaries.get(s.authorId) }));

    return NextResponse.json({ data, meta: { friendsCount: friendIds.length } });
  } catch (error) {
    console.error('GET /api/social/statuses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Publish a status ({ text })
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.isGuest) {
      return NextResponse.json({ error: 'Guests cannot post statuses' }, { status: 403 });
    }

    const { text } = await request.json();
    const trimmed = typeof text === 'string' ? text.trim() : '';
    if (!trimmed || trimmed.length > MAX_STATUS_LENGTH) {
      return NextResponse.json(
        { error: `Status must be 1-${MAX_STATUS_LENGTH} characters` },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const status = await SocialStatus.create({ authorId: user.id, text: trimmed });
    const author = (await getUserSummaries([user.id])).get(user.id);

    return NextResponse.json({ data: { ...status.toJSON(), author } }, { status: 201 });
  } catch (error) {
    console.error('POST /api/social/statuses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
