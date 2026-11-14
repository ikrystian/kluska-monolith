import { NextRequest, NextResponse } from 'next/server';
import { Model } from 'mongoose';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { byteSize, compact, sendSerialized, serializeJson, type SerializedJson } from '@/lib/http-cache';
import { cached, cacheKeys } from '@/lib/server-cache';
import { describeFinishedActivity, notifyFriendsOfActivity } from '@/lib/friends';
import { refreshUserChallenges } from '@/lib/challenges';
import { AccessContext, AccessError, isPublicCollection, sanitizeBody, scopeRead } from '@/lib/db-access';
import { linkWorkoutLogExercises } from '@/lib/workout-log-exercises';
import { onActivityLogged, onRunLogged, onWorkoutCompleted } from '@/lib/gamification';

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

/**
 * Collections every caller reads the same way and that change rarely. Their
 * list reads are answered from lib/server-cache instead of MongoDB; the models
 * drop the cached answers on every write (see `invalidateOnWrite`).
 */
const SHARED_COLLECTIONS = new Set([
  'exercises',
  'muscleGroups',
  'articleCategories',
  'articles',
  'gyms',
  'runningPrograms',
]);
const SHARED_READ_TTL_MS = 60_000;

/**
 * Collections read as plain objects instead of Mongoose documents.
 *
 * Building 5 600 exercise documents and running `toJSON` on each takes about
 * 1.3 s of CPU, during which the server answers nobody else; the same list as
 * plain objects takes about 0.3 s. Each function below reproduces exactly what
 * that model's `toJSON` would have sent: schema defaults for fields missing in
 * the stored document, `id`, and no `__v`.
 */
const LEAN_SHAPERS: Record<string, (doc: any, omitted: string[]) => any> = {
  exercises: ({ __v, ...doc }, omitted) => {
    for (const field of ['mainMuscleGroups', 'secondaryMuscleGroups', 'setup']) {
      if (doc[field] === undefined && !omitted.includes(field)) doc[field] = [];
    }
    if (doc.type === undefined && !omitted.includes('type')) doc.type = 'weight';
    doc.id = String(doc._id);
    return doc;
  },
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
    // omit=a,b → leave those fields out of every document. Lets list screens skip
    // heavy fields they never show (a run's GPS track, an article's body).
    // Exclusion only, so it can never surface a field a full read would not.
    const omit = (searchParams.get('omit') ?? '')
      .split(',')
      .map((field) => field.trim())
      .filter((field) => /^[A-Za-z0-9_.]+$/.test(field) && field !== '_id');

    // The client's filter is narrowed to the documents this user may read.
    const filter = await scopeRead(new AccessContext(user), collection, queryParam ? JSON.parse(queryParam) : {});

    const load = async (): Promise<SerializedJson> => {
      // count=1 → return only the number of documents matching the filter.
      // Used for "all vs filtered" totals in paged views (e.g. exercise library).
      if (countParam === '1') {
        const total = await Model.countDocuments(filter);
        return serializeJson({ total });
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

      if (omit.length > 0) {
        query = query.select(omit.map((field) => `-${field}`).join(' '));
      }

      const shape = LEAN_SHAPERS[collection];
      if (shape) {
        const docs = await query.lean().exec();
        return serializeJson({ data: docs.map((doc: any) => shape(doc, omit)) });
      }

      const data = await query.exec();

      // Enrich conversations with athlete avatarUrl
      if (collection === 'conversations' && data.length > 0) {
        const athleteIds = [...new Set<string>(data.map((conv: any) => conv.athleteId))];
        const athletes = await User.find({ _id: { $in: athleteIds } }).select('avatarUrl').lean();
        const athleteMap = new Map(athletes.map((a: any) => [a._id.toString(), a]));

        const enrichedData = data.map((conv: any) => {
          const athlete = athleteMap.get(conv.athleteId);
          const convObj = conv.toJSON ? conv.toJSON() : conv;
          return {
            ...convObj,
            athleteAvatarUrl: athlete?.avatarUrl,
          };
        });

        return serializeJson({ data: enrichedData });
      }

      return serializeJson({ data });
    };

    // Reference data: the answer depends only on the effective filter (which is
    // part of the key), so one computed response serves every caller.
    const result = SHARED_COLLECTIONS.has(collection)
      ? await cached(
          cacheKeys.collection(collection) +
            JSON.stringify([filter, sortParam, skipParam, limitParam, countParam, omit]),
          { ttlMs: SHARED_READ_TTL_MS, sizeOf: byteSize },
          async () => compact(await load())
        )
      : await load();

    return sendSerialized(request, result);
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
    if (collection === 'workoutLogs' && Array.isArray(body.exercises)) {
      body.exercises = await linkWorkoutLogExercises(body.exercises);
    }
    const doc = new Model(body);
    await doc.save();

    // A workout saved as already completed, or a recorded run: tell friends.
    const activity = describeFinishedActivity(collection, doc.toObject());
    if (activity) void notifyFriendsOfActivity(user.id, activity);

    // Nagrody: trening zapisany od razu jako ukończony, bieg albo pomiar.
    if (collection === 'workoutLogs' && doc.status === 'completed') {
      try {
        const rewards = await onWorkoutCompleted(doc.toObject(), { actorId: user.id });
        if (rewards) {
          return NextResponse.json({ data: { ...doc.toJSON(), rewards, newRecords: rewards.newRecords } }, { status: 201 });
        }
      } catch (error) {
        console.error('Failed to award workout rewards:', error);
      }
    } else if (collection === 'runningSessions' && doc.ownerId) {
      // A run may decide a challenge (or take the lead in one) — settle it now, not on the next read.
      void refreshUserChallenges(doc.ownerId);
      // Czekamy na nagrody, żeby ekran podsumowania biegu dostał je od razu w odpowiedzi.
      const rewards = await onRunLogged(doc.ownerId, doc.toObject());
      if (rewards) return NextResponse.json({ data: { ...doc.toJSON(), rewards } }, { status: 201 });
    } else if (collection === 'bodyMeasurements' && doc.ownerId) {
      void onActivityLogged(doc.ownerId);
    }

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

