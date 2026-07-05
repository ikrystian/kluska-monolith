import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import {
  getAchievementsWithProgress,
  getUnlockedAchievements,
  checkAndAwardAchievements
} from '@/lib/gamification';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unlockedOnly = searchParams.get('unlocked') === 'true';

    if (unlockedOnly) {
      const achievements = await getUnlockedAchievements(user.id);
      return NextResponse.json(achievements);
    }

    const achievementsWithProgress = await getAchievementsWithProgress(user.id);

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
    const user = await getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check and award any new achievements
    const newAchievements = await checkAndAwardAchievements(user.id);

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