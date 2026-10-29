import { NextRequest, NextResponse } from 'next/server';
import { Model } from 'mongoose';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { jsonWithEtag } from '@/lib/http-cache';
import { describeFinishedActivity, notifyFriendsOfActivity } from '@/lib/friends';
import { AccessContext, AccessError, isPublicCollection, sanitizeBody, scopeRead } from '@/lib/db-access';

import {
  User,
  Article,
  ArticleCategory,
  Exercise,
  WorkoutLog,
  WorkoutPlan,
  Conversation,
  Message,
  BodyMeasurement,
  RunningSession,
  RunningProgram,
  Goal,
  MuscleGroup,
  Gym,
  PlannedWorkout,
  TrainerRequest,
  Meal,
  Achievement,
  Workout,
  SocialProfile,
  SocialPost,
  TrainingSession,
  Habit,
  HabitLog,
  Survey,
  SurveyResponse,
  StravaActivity,
  Challenge
} from '@/models';

const modelMap: Record<string, any> = {
  users: User,
  articles: Article,
  articleCategories: ArticleCategory,
  exercises: Exercise,
  workoutLogs: WorkoutLog,
  goals: Goal,
  workoutPlans: WorkoutPlan,
  plannedWorkouts: PlannedWorkout,
  muscleGroups: MuscleGroup,
  conversations: Conversation,
  messages: Message,
  bodyMeasurements: BodyMeasurement,
  trainerRequests: TrainerRequest,
  meals: Meal,
  runningSessions: RunningSession,
  runningPrograms: RunningProgram,
  achievements: Achievement,
  gyms: Gym,
  workouts: Workout,
  socialProfiles: SocialProfile,
  socialPosts: SocialPost,
  trainingSessions: TrainingSession,
  habits: Habit,
  habitlogs: HabitLog,
  surveys: Survey,
  surveyResponses: SurveyResponse,
  stravaActivities: StravaActivity,
  challenges: Challenge,
};

// GET - Fetch collection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const user = await getRequestUser(request);

    const { collection } = await params;

    if (!isPublicCollection(collection) && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();


    const Model = modelMap[collection];

    if (!Model) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const queryParam = searchParams.get('query');
    const sortParam = searchParams.get('sort');
    const limitParam = searchParams.get('limit');
    const skipParam = searchParams.get('skip');
    const countParam = searchParams.get('count');

    // The client's filter is narrowed to the documents this user may read.
    const filter = await scopeRead(new AccessContext(user), collection, queryParam ? JSON.parse(queryParam) : {});

    // count=1 → return only the number of documents matching the filter.
    // Used for "all vs filtered" totals in paged views (e.g. exercise library).
    if (countParam === '1') {
      const total = await Model.countDocuments(filter);
      return jsonWithEtag(request, { total });
    }

    let query = Model.find(filter);

    if (sortParam) {
      const sortObj = JSON.parse(sortParam);
      query = query.sort(sortObj);
    }

    if (skipParam) {
      query = query.skip(parseInt(skipParam, 10) || 0);
    }

    if (limitParam) {
      query = query.limit(parseInt(limitParam));
    }

    const data = await query.exec();

    // Enrich conversations with athlete avatarUrl
    if (collection === 'conversations' && data.length > 0) {
      const athleteIds = [...new Set<string>(data.map((conv: any) => conv.athleteId))];
      const athletes = await User.find({ _id: { $in: athleteIds } }).lean();
      const athleteMap = new Map(athletes.map((a: any) => [a._id.toString(), a]));

      const enrichedData = data.map((conv: any) => {
        const athlete = athleteMap.get(conv.athleteId);
        const convObj = conv.toJSON ? conv.toJSON() : conv;
        return {
          ...convObj,
          athleteAvatarUrl: athlete?.avatarUrl,
        };
      });

      return jsonWithEtag(request, { data: enrichedData });
    }

    return jsonWithEtag(request, { data });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/db/[collection] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const user = await getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { collection } = await params;
    let Model = modelMap[collection];

    // Robust lookup fallback
    if (!Model && collection === 'workoutPlans') {
      Model = WorkoutPlan;
    }

    if (!Model) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const body = await sanitizeBody(new AccessContext(user), collection, await request.json(), true);
    const doc = new Model(body);
    await doc.save();

    // A workout saved as already completed, or a recorded run: tell friends.
    const activity = describeFinishedActivity(collection, doc.toObject());
    if (activity) void notifyFriendsOfActivity(user.id, activity);

    return NextResponse.json({ data: doc.toJSON() }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/db/[collection] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

