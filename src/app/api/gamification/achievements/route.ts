import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getAchievementsWithProgress,
  getUnlockedAchievements,
  checkAndAwardAchievements
} from '@/lib/gamification';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unlockedOnly = searchParams.get('unlocked') === 'true';

    if (unlockedOnly) {
      const achievements = await getUnlockedAchievements(session.user.id);
      return NextResponse.json(achievements);
    }

    const achievementsWithProgress = await getAchievementsWithProgress(session.user.id);

    return NextResponse.json(achievementsWithProgress);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
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

    // Check and award any new achievements
    const newAchievements = await checkAndAwardAchievements(session.user.id);

    return NextResponse.json({
      newAchievements,
      count: newAchievements.length,
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    return NextResponse.json(
      { error: 'Failed to check achievements' },
      { status: 500 }
    );
  }
}