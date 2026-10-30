import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { WorkoutPlan } from '@/models/WorkoutPlan';

/**
 * Aggregate, non-identifying numbers for a trainer's public profile. Athletes
 * can't read each other's user documents, so the counts are computed here.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
  }

  await connectToDatabase();

  const trainer = await User.findOne({ _id: id, role: 'trainer' }).select('createdAt').lean().exec();
  if (!trainer) {
    return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
  }

  const [athletesCount, plansCount] = await Promise.all([
    User.countDocuments({ role: 'athlete', trainerId: id }),
    WorkoutPlan.countDocuments({ trainerId: id, isDraft: false }),
  ]);

  return NextResponse.json({
    athletesCount,
    plansCount,
    memberSince: (trainer as { createdAt?: Date }).createdAt?.toISOString() ?? null,
  });
}
