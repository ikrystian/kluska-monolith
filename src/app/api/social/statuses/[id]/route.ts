import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { SocialStatus } from '@/models';

// DELETE - Remove a status; only its author (or an admin) may do it
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
      return NextResponse.json({ error: 'Status not found' }, { status: 404 });
    }

    await connectToDatabase();

    const filter = user.role === 'admin' ? { _id: id } : { _id: id, authorId: user.id };
    const result = await SocialStatus.deleteOne(filter);

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Status not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/social/statuses/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
