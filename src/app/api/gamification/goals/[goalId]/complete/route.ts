import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { getRequestUser } from '@/lib/api-auth';
import { completeGoal, isGoalReached, syncProgress } from '@/lib/gamification';
import { calculateLevelFromXP } from '@/lib/gamification';
import { getOrCreateGamificationProfile } from '@/lib/gamification';
import { connectToDatabase } from '@/lib/mongodb';
import { Goal } from '@/models/Goal';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const user = await getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { goalId } = await params;
    if (!isValidObjectId(goalId)) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await connectToDatabase();

    // Verify the goal belongs to the user
    const goal = await Goal.findById(goalId);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    if (goal.ownerId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (goal.status === 'completed') {
      return NextResponse.json({ error: 'Goal already completed' }, { status: 400 });
    }

    if (!isGoalReached(goal)) {
      return NextResponse.json({ error: 'Cel nie jest jeszcze osiągnięty' }, { status: 400 });
    }

    const before = await getOrCreateGamificationProfile(user.id);
    const levelBefore = calculateLevelFromXP(before.experiencePoints).level;

    const completion = await completeGoal(goalId, user.id);
    if (!completion) {
      return NextResponse.json({ error: 'Goal already completed' }, { status: 400 });
    }

    // Zamknięty cel może odblokować osiągnięcia ze ścieżki „Cele”.
    const sync = await syncProgress(user.id);
    const levelAfter = calculateLevelFromXP(sync.profile.experiencePoints).level;

    return NextResponse.json({
      success: true,
      points: completion.points,
      newBalance: sync.profile.currentFitCoins,
      levelUp: levelAfter > levelBefore,
      level: levelAfter,
      newAchievements: sync.unlocked,
    });
  } catch (error) {
    console.error('Error completing goal:', error);
    return NextResponse.json(
      { error: 'Failed to complete goal' },
      { status: 500 }
    );
  }
}
