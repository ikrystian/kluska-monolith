import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { isValidObjectId } from 'mongoose';
import { jsonWithEtag } from '@/lib/http-cache';
import { cascadeDeleteUserData } from '@/lib/user-cascade-delete';
import {
  AccessContext,
  AccessError,
  sanitizeBody,
  scopeRead,
  scopeWrite,
  trainerAssignmentUpdate,
} from '@/lib/db-access';

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
import { RunningProgram } from '@/models/RunningProgram';
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
  runningPrograms: RunningProgram,
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
    const user = await getRequestUser(request);

    await connectToDatabase();

    const { collection, id } = await params;

    const Model = modelMap[collection];

    if (!Model) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // A document outside the caller's scope is reported as missing.
    const doc = await Model.findOne(await scopeRead(new AccessContext(user), collection, { _id: id })).exec();

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return jsonWithEtag(request, { data: doc.toJSON() });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
    const user = await getRequestUser(request);

    if (!user) {
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

    const ctx = new AccessContext(user);
    const rawBody = await request.json();

    // Special handling for socialPosts - toggle like functionality. Anyone who
    // can see a post may like it, but only on their own behalf.
    if (collection === 'socialPosts' && rawBody.toggleLike && rawBody.userId) {
      if (rawBody.userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const post = await Model.findOne(await scopeRead(ctx, collection, { _id: id })).exec();
      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }

      const userId = user.id;
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

    let body;
    if (collection === 'users') {
      const target = await Model.findOne(await scopeWrite(ctx, collection, { _id: id }))
        .select('role trainerId')
        .lean()
        .exec();
      if (!target) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      // A trainer editing someone else may only (un)assign them as their athlete.
      body = (await trainerAssignmentUpdate(ctx, target, rawBody)) ?? (await sanitizeBody(ctx, collection, rawBody, false));
    } else {
      body = await sanitizeBody(ctx, collection, rawBody, false);
    }

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

    const doc = await Model.findOneAndUpdate(await scopeWrite(ctx, collection, { _id: id }), body, { new: true }).exec();

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ data: doc.toJSON() });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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
    const user = await getRequestUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { collection, id } = await params;
    const Model = modelMap[collection];

    if (!Model) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    if (collection === 'users' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Deleting a user also removes everything the app stores about them —
    // their own records plus anything tying them to another user (chats,
    // challenges, client plans). Runs before the User doc itself is removed
    // so a failure here leaves the account intact rather than orphaning data.
    if (collection === 'users') {
      await cascadeDeleteUserData(id);
    }

    const doc = await Model.findOneAndDelete(await scopeWrite(new AccessContext(user), collection, { _id: id })).exec();

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Messages only exist inside their conversation.
    if (collection === 'conversations') {
      await Message.deleteMany({ conversationId: id }).exec();
    }

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('DELETE /api/db/[collection]/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
