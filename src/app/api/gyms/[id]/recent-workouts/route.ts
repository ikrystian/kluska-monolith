import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserSummaries } from '@/lib/friends';
import { WorkoutLog } from '@/models/WorkoutLog';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
const EXERCISE_NAMES_PER_WORKOUT = 4;

// GET - Most recent completed workouts logged at a gym, by any athlete.
// Photos attached to a workout are returned too.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: gymId } = await params;
    if (!gymId) {
      return NextResponse.json({ error: 'Gym ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    await connectToDatabase();

    const logs = await WorkoutLog.find({ gymId, status: 'completed' })
      .select('athleteId workoutName endTime duration exercises.exercise.name photoURL')
      .sort({ endTime: -1 })
      .limit(limit)
      .lean();

    const summaries = await getUserSummaries(logs.map(log => log.athleteId));

    const data = logs
      .filter(log => summaries.has(log.athleteId))
      .map(log => ({
        id: String(log._id),
        workoutName: log.workoutName,
        endTime: log.endTime,
        durationMin: log.duration,
        exerciseCount: log.exercises?.length ?? 0,
        exerciseNames: (log.exercises ?? [])
          .map(series => series.exercise?.name)
          .filter((name): name is string => Boolean(name))
          .slice(0, EXERCISE_NAMES_PER_WORKOUT),
        photoUrl: log.photoURL || undefined,
        user: summaries.get(log.athleteId),
      }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/gyms/[id]/recent-workouts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
