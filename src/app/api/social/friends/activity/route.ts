import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { getFriendIds, getUserSummaries } from '@/lib/friends';
import { RunningSession, SocialStatus, StravaActivity, WorkoutLog } from '@/models';

const DEFAULT_DAYS = 14;
const MAX_ITEMS = 30;

type ActivityItem = {
  id: string;
  type: 'workout' | 'run' | 'strava' | 'status';
  userId: string;
  date: Date;
  title: string;
  /** km, for runs and Strava activities */
  distanceKm?: number;
  /** minutes */
  durationMin?: number;
  exerciseCount?: number;
  /** Strava sport type (Run, Ride, ...) */
  sport?: string;
  text?: string;
};

// GET - Recent activity of the caller's accepted friends (workouts, runs, statuses)
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(Number(searchParams.get('days')) || DEFAULT_DAYS, 1), 60);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || MAX_ITEMS, 1), 100);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    await connectToDatabase();

    const friendIds = await getFriendIds(user.id);
    if (friendIds.length === 0) {
      return NextResponse.json({ data: [], meta: { friendsCount: 0 } });
    }

    const [workouts, runs, stravaActivities, statuses, summaries] = await Promise.all([
      WorkoutLog.find({ athleteId: { $in: friendIds }, status: 'completed', endTime: { $gte: since } })
        .select('athleteId workoutName endTime duration exercises.exercise.name')
        .sort({ endTime: -1 })
        .limit(limit)
        .lean(),
      RunningSession.find({ ownerId: { $in: friendIds }, date: { $gte: since } })
        .select('ownerId date distance duration programName')
        .sort({ date: -1 })
        .limit(limit)
        .lean(),
      StravaActivity.find({ ownerId: { $in: friendIds }, date: { $gte: since } })
        .select('ownerId name type date distance movingTime')
        .sort({ date: -1 })
        .limit(limit)
        .lean(),
      SocialStatus.find({ authorId: { $in: friendIds }, createdAt: { $gte: since } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      getUserSummaries(friendIds),
    ]);

    const items: ActivityItem[] = [
      ...workouts.map(w => ({
        id: String(w._id),
        type: 'workout' as const,
        userId: w.athleteId,
        date: w.endTime as Date,
        title: w.workoutName,
        durationMin: w.duration,
        exerciseCount: w.exercises?.length ?? 0,
      })),
      ...runs.map(r => ({
        id: String(r._id),
        type: 'run' as const,
        userId: r.ownerId,
        date: r.date,
        title: r.programName || 'Bieg',
        distanceKm: r.distance,
        durationMin: r.duration,
      })),
      ...stravaActivities.map(a => ({
        id: String(a._id),
        type: 'strava' as const,
        userId: a.ownerId,
        date: a.date,
        title: a.name,
        sport: a.type,
        distanceKm: a.distance / 1000,
        durationMin: Math.round(a.movingTime / 60),
      })),
      ...statuses.map(s => ({
        id: String(s._id),
        type: 'status' as const,
        userId: s.authorId,
        date: s.createdAt,
        title: 'Nowy status',
        text: s.text,
      })),
    ];

    const data = items
      .filter(item => summaries.has(item.userId))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)
      .map(item => ({ ...item, user: summaries.get(item.userId) }));

    return NextResponse.json({ data, meta: { friendsCount: friendIds.length } });
  } catch (error) {
    console.error('GET /api/social/friends/activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
