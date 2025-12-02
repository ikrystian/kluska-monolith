import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { awardGoalCompletionPoints, checkAndAwardAchievements } from '@/lib/gamification';
import { connectToDatabase } from '@/lib/mongodb';
import { Goal } from '@/models/Goal';

export async function POST(
  request: NextRequest,
  { params }: { params: { goalId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { goalId } = params;
    const body = await request.json();
    const { trainerApproval = false } = body;

    await connectToDatabase();

    // Verify the goal belongs to the user
    const goal = await Goal.findById(goalId);
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    if (goal.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (goal.status === 'completed') {
      return NextResponse.json({ error: 'Goal already completed' }, { status: 400 });
    }

    // Update goal status
    goal.status = 'completed';
    goal.current = goal.target;
    await goal.save();

    // Award points
    const pointsResult = await awardGoalCompletionPoints(
      goalId,
      session.user.id,
      trainerApproval
    );

    // Check for new achievements
    const newAchievements = await checkAndAwardAchievements(session.user.id);

    return NextResponse.json({
      success: true,
      points: pointsResult.points,
      newBalance: pointsResult.newBalance,
      levelUp: pointsResult.levelUp,
      newAchievements,
    });
  } catch (error) {
    console.error('Error completing goal:', error);
    return NextResponse.json(
      { error: 'Failed to complete goal' },
      { status: 500 }
    );
  }
}