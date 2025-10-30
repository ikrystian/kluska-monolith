import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// Import all models
import { User } from '@/models/User';
import { Article } from '@/models/Article';
import {
  ArticleCategory,
  Exercise,
  WorkoutLog,
  Goal,
  WorkoutPlan,
  PlannedWorkout,
  MuscleGroup
} from '@/models';
import {
  Conversation,
  Message,
  BodyMeasurement,
  TrainerRequest,
  Meal,
  RunningSession,
  Achievement,
  Gym
} from '@/models/Conversation';

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

// GET - Fetch single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Some documents might be public, adjust as needed
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    await connectToDatabase();

    const { collection, id } = await params;
    const Model = modelMap[collection];

    if (!Model) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const doc = await Model.findById(id);

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ data: doc.toJSON() });
  } catch (error) {
    console.error('GET /api/db/[collection]/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH - Update document
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { collection, id } = await params;
    const Model = modelMap[collection];

    if (!Model) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const body = await request.json();
    const doc = await Model.findByIdAndUpdate(id, body, { new: true });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ data: doc.toJSON() });
  } catch (error) {
    console.error('PATCH /api/db/[collection]/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { collection, id } = await params;
    const Model = modelMap[collection];

    if (!Model) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    const doc = await Model.findByIdAndDelete(id);

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/db/[collection]/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

