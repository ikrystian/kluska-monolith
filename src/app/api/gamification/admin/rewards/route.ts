import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Reward } from '@/models/Reward';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only trainers and admins can manage rewards
    if (session.user.role !== 'trainer' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();

    const rewards = await Reward.find().sort({ createdAt: -1 });

    return NextResponse.json(rewards);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only trainers and admins can create rewards
    if (session.user.role !== 'trainer' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      fitCoinCost,
      tier,
      availability,
      maxRedemptions,
      imageUrl,
      validFrom,
      validUntil,
    } = body;

    if (!title || !description || !category || !fitCoinCost || !tier) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const reward = await Reward.create({
      title,
      description,
      category,
      fitCoinCost,
      tier,
      availability: availability || 'always',
      maxRedemptions,
      imageUrl,
      validFrom: validFrom ? new Date(validFrom) : undefined,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      createdBy: session.user.id,
      isActive: true,
      currentRedemptions: 0,
    });

    return NextResponse.json(reward, { status: 201 });
  } catch (error) {
    console.error('Error creating reward:', error);
    return NextResponse.json(
      { error: 'Failed to create reward' },
      { status: 500 }
    );
  }
}