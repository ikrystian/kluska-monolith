import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// Import all models
import { User } from '@/models/User';
import { Article } from '@/models/Article';
import { Exercise } from '@/models/Exercise';
import { WorkoutLog } from '@/models/WorkoutLog';
import { WorkoutPlan } from '@/models/WorkoutPlan';
import { Conversation } from '@/models/Conversation';
import { Message } from '@/models/Message';
import { BodyMeasurement } from '@/models/BodyMeasurement';
import { RunningSession } from '@/models/RunningSession';
import { Goal } from '@/models/Goal';
import { MuscleGroup } from '@/models/MuscleGroup';
import { Gym } from '@/models/Gym';
import {
  ArticleCategory,
  PlannedWorkout,
  TrainerRequest,
  Meal,
  Achievement
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
  achievements: Achievement,
  gyms: Gym,
};

// GET - Fetch collection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Some collections might be public, adjust as needed
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    await connectToDatabase();

    const { collection } = await params;
    const Model = modelMap[collection];

    if (!Model) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const queryParam = searchParams.get('query');
    const sortParam = searchParams.get('sort');
    const limitParam = searchParams.get('limit');

    let query = Model.find();

    if (queryParam) {
      const queryObj = JSON.parse(queryParam);
      query = query.find(queryObj);
    }

    if (sortParam) {
      const sortObj = JSON.parse(sortParam);
      query = query.sort(sortObj);
    }

    if (limitParam) {
      query = query.limit(parseInt(limitParam));
    }

    const data = await query.exec();

    return NextResponse.json({ data });
  } catch (error) {
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
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { collection } = await params;
    const Model = modelMap[collection];

    if (!Model) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const body = await request.json();
    const doc = new Model(body);
    await doc.save();

    return NextResponse.json({ data: doc.toJSON() }, { status: 201 });
  } catch (error) {
    console.error('POST /api/db/[collection] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

