import { NextRequest, NextResponse } from 'next/server';
import type { Model } from 'mongoose';
import { adminErrorResponse, requireAdmin } from '@/lib/admin/guard';
import { adStatus } from '@/lib/ads';
import { getAdStats } from '@/lib/ads-server';
import { connectToDatabase } from '@/lib/mongodb';
import { cached } from '@/lib/server-cache';
import {
  Article,
  DashboardPromo,
  DietPlan,
  Exercise,
  FoodDiaryEntry,
  GamificationProfile,
  Gym,
  RunningProgram,
  RunningSession,
  SavedMeal,
  SocialPost,
  TrainerRequest,
  User,
  WeeklyCheckIn,
  Workout,
  WorkoutLog,
  WorkoutPlan,
} from '@/models';
import { Ad } from '@/models/Ad';
import { AuditLog } from '@/models/AuditLog';

const STATS_TTL_MS = 30_000;
const SERIES_DAYS = 30;
const TIME_ZONE = 'Europe/Warsaw';

const dayKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

/** Records per local day since `since`, keyed `YYYY-MM-DD`. */
async function perDay(model: Model<any>, field: string, since: Date, match: Record<string, unknown> = {}) {
  const rows = await model.aggregate<{ _id: string; count: number }>([
    { $match: { ...match, [field]: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${field}`, timezone: TIME_ZONE } }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.count]));
}

async function loadStats() {
  await connectToDatabase();

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const daysAgo = (days: number) => new Date(startOfToday.getTime() - days * 86_400_000);
  const week = daysAgo(6);
  const month = daysAgo(SERIES_DAYS - 1);

  const [
    usersByRole,
    guests,
    unverified,
    usersToday,
    usersWeek,
    usersMonth,
    workoutsToday,
    workoutsWeek,
    workoutsMonth,
    workoutsInProgress,
    runsWeek,
    runsMonth,
    diaryWeek,
    postsWeek,
    exercises,
    publicExercises,
    articlesPublished,
    articlesDraft,
    gyms,
    workouts,
    workoutPlans,
    savedMeals,
    dietPlans,
    runningPrograms,
    pendingRequests,
    checkInsToReview,
    gamification,
    topAthletes,
    recentUsers,
    recentChanges,
    usersSeries,
    workoutsSeries,
    runsSeries,
    ads,
    adStats,
    promos,
  ] = await Promise.all([
    User.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.countDocuments({ isGuest: true }),
    User.countDocuments({ isGuest: { $ne: true }, emailVerified: { $ne: true } }),
    User.countDocuments({ createdAt: { $gte: startOfToday } }),
    User.countDocuments({ createdAt: { $gte: week } }),
    User.countDocuments({ createdAt: { $gte: month } }),
    WorkoutLog.countDocuments({ startTime: { $gte: startOfToday } }),
    WorkoutLog.countDocuments({ startTime: { $gte: week } }),
    WorkoutLog.countDocuments({ startTime: { $gte: month } }),
    WorkoutLog.countDocuments({ status: 'in-progress' }),
    RunningSession.countDocuments({ date: { $gte: week } }),
    RunningSession.countDocuments({ date: { $gte: month } }),
    FoodDiaryEntry.countDocuments({ createdAt: { $gte: week } }),
    SocialPost.countDocuments({ createdAt: { $gte: week } }),
    Exercise.estimatedDocumentCount(),
    Exercise.countDocuments({ ownerId: 'public' }),
    Article.countDocuments({ status: 'published' }),
    Article.countDocuments({ status: 'draft' }),
    Gym.estimatedDocumentCount(),
    Workout.estimatedDocumentCount(),
    WorkoutPlan.estimatedDocumentCount(),
    SavedMeal.estimatedDocumentCount(),
    DietPlan.estimatedDocumentCount(),
    RunningProgram.estimatedDocumentCount(),
    TrainerRequest.countDocuments({ status: 'pending' }),
    WeeklyCheckIn.countDocuments({ status: 'submitted' }),
    GamificationProfile.aggregate<{ _id: null; fitCoins: number; points: number; avgLevel: number; profiles: number }>([
      {
        $group: {
          _id: null,
          fitCoins: { $sum: '$currentFitCoins' },
          points: { $sum: '$totalPointsEarned' },
          avgLevel: { $avg: '$level' },
          profiles: { $sum: 1 },
        },
      },
    ]),
    WorkoutLog.aggregate<{ _id: string; count: number }>([
      { $match: { startTime: { $gte: month }, status: 'completed' } },
      { $group: { _id: '$athleteId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    User.find({}).sort({ createdAt: -1 }).limit(6).select('name email role isGuest createdAt').lean(),
    AuditLog.find({}).sort({ createdAt: -1 }).limit(8).lean(),
    perDay(User, 'createdAt', month),
    perDay(WorkoutLog, 'startTime', month),
    perDay(RunningSession, 'date', month),
    Ad.find({}).select('active startsAt endsAt maxImpressions maxClicks impressions clicks').lean(),
    getAdStats({ days: 7 }),
    DashboardPromo.countDocuments({ active: true }),
  ]);

  const topIds = topAthletes.map((row) => row._id).filter((id) => /^[a-f0-9]{24}$/i.test(String(id)));
  const topUsers = topIds.length ? await User.find({ _id: { $in: topIds } }).select('name email').lean() : [];
  const nameById = new Map(topUsers.map((user) => [String(user._id), user.name || user.email]));

  const series = Array.from({ length: SERIES_DAYS }, (_, index) => {
    const key = dayKey(new Date(month.getTime() + index * 86_400_000 + 12 * 3_600_000));
    return {
      day: key,
      users: usersSeries.get(key) ?? 0,
      workouts: workoutsSeries.get(key) ?? 0,
      runs: runsSeries.get(key) ?? 0,
    };
  });

  const roles = Object.fromEntries(usersByRole.map((row) => [row._id, row.count]));
  const totalUsers = usersByRole.reduce((sum, row) => sum + row.count, 0);

  return {
    generatedAt: now.toISOString(),
    users: {
      total: totalUsers,
      athletes: roles.athlete ?? 0,
      trainers: roles.trainer ?? 0,
      admins: roles.admin ?? 0,
      guests,
      unverified,
      today: usersToday,
      week: usersWeek,
      month: usersMonth,
    },
    activity: {
      workoutsToday,
      workoutsWeek,
      workoutsMonth,
      workoutsInProgress,
      runsWeek,
      runsMonth,
      diaryWeek,
      postsWeek,
    },
    content: {
      exercises,
      publicExercises,
      articlesPublished,
      articlesDraft,
      gyms,
      workouts,
      workoutPlans,
      savedMeals,
      dietPlans,
      runningPrograms,
    },
    attention: { pendingRequests, checkInsToReview, articlesDraft, unverified },
    gamification: {
      fitCoins: gamification[0]?.fitCoins ?? 0,
      points: gamification[0]?.points ?? 0,
      avgLevel: Math.round((gamification[0]?.avgLevel ?? 0) * 10) / 10,
      profiles: gamification[0]?.profiles ?? 0,
    },
    marketing: {
      adsTotal: ads.length,
      adsLive: ads.filter((ad) => adStatus(ad, now) === 'live').length,
      impressionsWeek: adStats.totals.impressions,
      clicksWeek: adStats.totals.clicks,
      promosActive: promos,
    },
    topAthletes: topAthletes.map((row) => ({
      id: String(row._id),
      name: nameById.get(String(row._id)) ?? 'Usunięte konto',
      count: row.count,
    })),
    recentUsers: recentUsers.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      isGuest: Boolean(user.isGuest),
      createdAt: (user as { createdAt?: Date }).createdAt ?? null,
    })),
    recentChanges: recentChanges.map((entry) => ({
      id: String(entry._id),
      summary: entry.summary,
      action: entry.action,
      resource: entry.resource,
      recordId: entry.recordId,
      createdAt: entry.createdAt,
    })),
    series,
  };
}

/** GET /api/admin/stats — numbers for the admin dashboard, counted in the database. */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const stats = await cached('admin-stats', { ttlMs: STATS_TTL_MS }, loadStats);
    return NextResponse.json(stats);
  } catch (error) {
    return adminErrorResponse(error, 'GET /api/admin/stats');
  }
}
