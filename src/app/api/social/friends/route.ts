import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserSummaries, notifyUser } from '@/lib/friends';
import { Friendship, User, friendshipPairKey, type IFriendship } from '@/models';

const FRIENDS_LINK = '/athlete/social?tab=friends';

// GET - The caller's friends plus pending invitations (incoming and outgoing)
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const friendships = await Friendship.find({
      $or: [{ requesterId: user.id }, { recipientId: user.id }],
    })
      .sort({ updatedAt: -1 })
      .lean();

    const otherId = (f: { requesterId: string; recipientId: string }) =>
      f.requesterId === user.id ? f.recipientId : f.requesterId;

    const summaries = await getUserSummaries(friendships.map(otherId));

    const toEntry = (f: (typeof friendships)[number]) => {
      const summary = summaries.get(otherId(f));
      if (!summary) return null; // account deleted
      return {
        friendshipId: String(f._id),
        since: f.acceptedAt ?? f.createdAt,
        user: summary,
      };
    };

    const pick = (predicate: (f: (typeof friendships)[number]) => boolean) =>
      friendships.filter(predicate).map(toEntry).filter(Boolean);

    return NextResponse.json({
      data: {
        friends: pick(f => f.status === 'accepted'),
        incoming: pick(f => f.status === 'pending' && f.recipientId === user.id),
        outgoing: pick(f => f.status === 'pending' && f.requesterId === user.id),
      },
    });
  } catch (error) {
    console.error('GET /api/social/friends error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send a friend invitation. Inviting someone who already invited you accepts theirs.
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.isGuest) {
      return NextResponse.json({ error: 'Guests cannot add friends' }, { status: 403 });
    }

    const { userId } = await request.json();
    if (typeof userId !== 'string' || !mongoose.isValidObjectId(userId)) {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 });
    }
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 });
    }

    await connectToDatabase();

    const target = await User.findById(userId).select('role isGuest').lean();
    if (!target || target.role !== 'athlete' || target.isGuest) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const myName = (await getUserSummaries([user.id])).get(user.id)?.displayName ?? user.name;
    const pairKey = friendshipPairKey(user.id, userId);
    let friendship = await Friendship.findOne({ pairKey });

    if (friendship?.status === 'pending' && friendship.recipientId === user.id) {
      friendship.status = 'accepted';
      friendship.acceptedAt = new Date();
      await friendship.save();
      await notifyUser(
        friendship.requesterId,
        'Nowy znajomy',
        `Ty i ${myName} jesteście teraz znajomymi.`,
        FRIENDS_LINK
      );
      return NextResponse.json({ data: friendship.toJSON() });
    }

    if (friendship) {
      // Already friends, or our own invitation is still pending — nothing to do.
      return NextResponse.json({ data: friendship.toJSON() });
    }

    try {
      friendship = await Friendship.create({
        requesterId: user.id,
        recipientId: userId,
        pairKey,
        status: 'pending',
      });
    } catch (error) {
      // Both users invited each other at the same moment — return the winner.
      if ((error as { code?: number }).code === 11000) {
        const existing = await Friendship.findOne({ pairKey });
        return NextResponse.json({ data: (existing as IFriendship | null)?.toJSON() ?? null });
      }
      throw error;
    }

    await notifyUser(
      userId,
      'Zaproszenie do znajomych',
      `${myName} zaprasza Cię do grona znajomych.`,
      FRIENDS_LINK
    );

    return NextResponse.json({ data: friendship.toJSON() }, { status: 201 });
  } catch (error) {
    console.error('POST /api/social/friends error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
