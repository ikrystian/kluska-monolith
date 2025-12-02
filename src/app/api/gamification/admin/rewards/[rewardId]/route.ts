import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Reward } from '@/models/Reward';

export async function GET(
  request: NextRequest,
  { params }: { params: { rewardId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const reward = await Reward.findById(params.rewardId);

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    return NextResponse.json(reward);
  } catch (error) {
    console.error('Error fetching reward:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reward' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { rewardId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'trainer' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    await connectToDatabase();

    const reward = await Reward.findByIdAndUpdate(
      params.rewardId,
      { $set: body },
      { new: true }
    );

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    return NextResponse.json(reward);
  } catch (error) {
    console.error('Error updating reward:', error);
    return NextResponse.json(
      { error: 'Failed to update reward' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { rewardId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'trainer' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();

    const reward = await Reward.findByIdAndDelete(params.rewardId);

    if (!reward) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reward:', error);
    return NextResponse.json(
      { error: 'Failed to delete reward' },
      { status: 500 }
    );
  }
}