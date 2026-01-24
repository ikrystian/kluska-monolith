import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { isValidObjectId } from 'mongoose';

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
  Achievement,
  Workout,
  SocialProfile,
  SocialPost,
  Habit,
  HabitLog,
  Survey,
  SurveyResponse
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
  workouts: Workout,
  socialProfiles: SocialProfile,
  socialPosts: SocialPost,
  habits: Habit,
  habitlogs: HabitLog,
  surveys: Survey,
  surveyResponses: SurveyResponse,
};

// GET - Fetch single document by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Some collections might be public, adjust as needed
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    await connectToDatabase();

    const { collection, id } = await params;

    const Model = modelMap[collection];

    if (!Model) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const doc = await Model.findById(id).exec();

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

// PATCH - Update single document by ID
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

    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const body = await request.json();

    // Special validation for users collection - check email uniqueness
    if (collection === 'users' && body.email) {
      const existingUser = await Model.findOne({
        email: body.email,
        _id: { $ne: id } // Exclude current user from the check
      }).exec();

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email address is already in use by another user' },
          { status: 400 }
        );
      }
    }

    // Special handling for socialPosts - toggle like functionality
    if (collection === 'socialPosts' && body.toggleLike && body.userId) {
      const post = await Model.findById(id).exec();
      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }

      const userId = body.userId;
      const likes = post.likes || [];
      const isLiked = likes.includes(userId);

      if (isLiked) {
        // Remove like
        post.likes = likes.filter((id: string) => id !== userId);
      } else {
        // Add like
        post.likes = [...likes, userId];
      }

      await post.save();
      return NextResponse.json({ data: post.toJSON() });
    }

    const doc = await Model.findByIdAndUpdate(id, body, { new: true }).exec();

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

// DELETE - Delete single document by ID
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

    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const doc = await Model.findByIdAndDelete(id).exec();

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/db/[collection]/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
