import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Goal } from '@/models/Goal';
import { toGoalView } from '@/lib/gamification';
import { dayKey } from '@/lib/gamification/streaks';

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  target: z.number().positive().max(10_000_000).optional(),
  /** Tylko cele ręczne — postęp celów automatycznych liczy serwer. */
  current: z.number().min(0).max(10_000_000).optional(),
  unit: z.string().trim().max(20).optional(),
  deadline: z.string().datetime().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });

    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Nieprawidłowe dane celu', issues: parsed.error.issues }, { status: 400 });
    }
    const input = parsed.data;

    await connectToDatabase();
    const goal = await Goal.findOne({ _id: id, ownerId: user.id });
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    if (goal.status !== 'active') {
      return NextResponse.json({ error: 'Zakończonego celu nie można edytować' }, { status: 400 });
    }

    const manual = (goal.metric ?? 'manual') === 'manual';

    if (input.title !== undefined) goal.title = input.title;
    if (input.description !== undefined) goal.description = input.description;
    if (input.target !== undefined) goal.target = input.target;
    if (input.deadline !== undefined) goal.deadline = input.deadline ? new Date(input.deadline) : undefined;
    if (manual && input.unit !== undefined) goal.unit = input.unit;

    if (manual && input.current !== undefined && input.current !== goal.current) {
      const today = dayKey(new Date());
      goal.current = input.current;
      goal.progressLog = [
        ...(goal.progressLog ?? []).filter(point => point.date !== today),
        { date: today, value: input.current },
      ].slice(-60);
    }

    await goal.save();
    return NextResponse.json(toGoalView(goal));
  } catch (error) {
    console.error('PATCH /api/athlete/goals/[id] error:', error);
    return NextResponse.json({ error: 'Nie udało się zapisać celu' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });

    await connectToDatabase();
    const deleted = await Goal.findOneAndDelete({ _id: id, ownerId: user.id });
    if (!deleted) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/athlete/goals/[id] error:', error);
    return NextResponse.json({ error: 'Nie udało się usunąć celu' }, { status: 500 });
  }
}
