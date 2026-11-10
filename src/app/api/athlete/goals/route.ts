import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Goal, GOAL_METRICS } from '@/models/Goal';
import {
  computeAthleteStats,
  currentFromRaw,
  GOAL_METRIC_UNITS,
  listGoals,
  rawMetricValue,
  toGoalView,
} from '@/lib/gamification';
import { dayKey } from '@/lib/gamification/streaks';

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  metric: z.enum(GOAL_METRICS).default('manual'),
  target: z.number().positive().max(10_000_000),
  /** Punkt startowy celu ręcznego. */
  current: z.number().min(0).max(10_000_000).optional(),
  unit: z.string().trim().max(20).optional(),
  deadline: z.string().datetime().optional(),
  exerciseId: z.string().max(64).optional(),
  exerciseName: z.string().trim().max(120).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return NextResponse.json(await listGoals(user.id));
  } catch (error) {
    console.error('GET /api/athlete/goals error:', error);
    return NextResponse.json({ error: 'Nie udało się pobrać celów' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Nieprawidłowe dane celu', issues: parsed.error.issues }, { status: 400 });
    }
    const input = parsed.data;

    if (input.metric === 'exercise_max_weight' && !input.exerciseId) {
      return NextResponse.json({ error: 'Wybierz ćwiczenie dla tego celu' }, { status: 400 });
    }

    await connectToDatabase();

    const now = new Date();
    let startValue = input.current ?? 0;
    let current = input.current ?? 0;
    let direction: 'up' | 'down' = 'up';
    let unit = input.unit || 'kg';

    if (input.metric !== 'manual') {
      const stats = await computeAthleteStats(user.id, now);
      const raw = await rawMetricValue(user.id, input.metric, stats, input.exerciseId);

      // Seria dni liczy się od zera — inaczej trwająca seria „osiągałaby” cel od razu.
      startValue = input.metric === 'streak_days' ? 0 : raw;
      current = currentFromRaw(input.metric, raw, startValue);
      unit = GOAL_METRIC_UNITS[input.metric] ?? unit;

      if (input.metric === 'body_weight') {
        if (raw <= 0) {
          return NextResponse.json({ error: 'Najpierw dodaj pomiar wagi ciała' }, { status: 400 });
        }
        direction = input.target < raw ? 'down' : 'up';
      }

      const alreadyReached = direction === 'down' ? current <= input.target : current >= input.target;
      if (alreadyReached) {
        return NextResponse.json({ error: 'Ten cel masz już osiągnięty — ustaw ambitniejszy' }, { status: 400 });
      }
    }

    const goal = await Goal.create({
      ownerId: user.id,
      title: input.title,
      description: input.description,
      metric: input.metric,
      target: input.target,
      current,
      unit,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
      exerciseId: input.metric === 'exercise_max_weight' ? input.exerciseId : undefined,
      exerciseName: input.metric === 'exercise_max_weight' ? input.exerciseName : undefined,
      direction,
      startValue,
      startDate: now,
      // Cel wpisywany ręcznie jest wart mniej niż potwierdzony danymi.
      basePoints: input.metric === 'manual' ? 50 : 100,
      progressLog: [{ date: dayKey(now), value: current }],
    });

    return NextResponse.json(toGoalView(goal, now), { status: 201 });
  } catch (error) {
    console.error('POST /api/athlete/goals error:', error);
    return NextResponse.json({ error: 'Nie udało się zapisać celu' }, { status: 500 });
  }
}
