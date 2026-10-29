import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserSummaries, notifyUser } from '@/lib/friends';
import { Friendship } from '@/models';

// PATCH - Accept an incoming invitation ({ action: 'accept' }); only the recipient may do it.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { action } = await request.json();
    if (action !== 'accept') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    await connectToDatabase();

    const friendship = await Friendship.findById(id);
    if (!friendship || friendship.recipientId !== user.id) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (friendship.status !== 'accepted') {
      friendship.status = 'accepted';
      friendship.acceptedAt = new Date();
      await friendship.save();

      const myName = (await getUserSummaries([user.id])).get(user.id)?.displayName ?? user.name;
      await notifyUser(
        friendship.requesterId,
        'Nowy znajomy',
        `Ty i ${myName} jesteście teraz znajomymi.`,
        '/athlete/social?tab=friends'
      );
    }

    return NextResponse.json({ data: friendship.toJSON() });
  } catch (error) {
    console.error('PATCH /api/social/friends/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Decline/cancel an invitation or remove a friend; either side may do it.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
    }

    await connectToDatabase();

    const result = await Friendship.deleteOne({
      _id: id,
      $or: [{ requesterId: user.id }, { recipientId: user.id }],
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/social/friends/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
