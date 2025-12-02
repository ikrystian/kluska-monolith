import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAvailableRewards, redeemReward } from '@/lib/gamification';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rewards = await getAvailableRewards(session.user.id);

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

    const body = await request.json();
    const { rewardId } = body;

    if (!rewardId) {
      return NextResponse.json({ error: 'Reward ID is required' }, { status: 400 });
    }

    const result = await redeemReward(session.user.id, rewardId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error redeeming reward:', error);
    return NextResponse.json(
      { error: 'Failed to redeem reward' },
      { status: 500 }
    );
  }
}