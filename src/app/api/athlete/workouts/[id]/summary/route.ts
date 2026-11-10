import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { WorkoutLog } from '@/models/WorkoutLog';
import { generateWorkoutSummary, type WorkoutSummaryExercise } from '@/lib/openrouter-workout-summary';

const toNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

/**
 * POST /api/athlete/workouts/[id]/summary
 * Returns the AI coach summary of the athlete's own finished workout.
 * The first call sends the workout (as JSON) to OpenRouter and stores the
 * reply on the log; later calls return the stored summary without a new request.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const { id } = await params;
        const log = await WorkoutLog.findOne({ _id: id, athleteId: user.id }).lean();
        if (!log) {
            return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
        }
        if (log.aiSummary) {
            return NextResponse.json({ summary: log.aiSummary });
        }

        let totalVolumeKg = 0;
        let completedSets = 0;
        const exercises: WorkoutSummaryExercise[] = (log.exercises || []).map((series: any) => {
            const type = series.exercise?.type || 'weight';
            return {
                name: series.exercise?.name || 'Ćwiczenie',
                type,
                muscleGroups: (series.exercise?.mainMuscleGroups || []).map((mg: any) => mg?.name).filter(Boolean),
                sets: (series.sets || []).map((set: any) => {
                    const reps = toNumber(set.reps);
                    const weightKg = toNumber(set.weight);
                    if (set.completed) {
                        completedSets += 1;
                        if (type === 'weight') totalVolumeKg += reps * weightKg;
                    }
                    return {
                        number: toNumber(set.number),
                        type: set.type,
                        reps,
                        weightKg,
                        ...(set.duration ? { durationS: toNumber(set.duration) } : {}),
                        ...(set.rpe ? { rpe: toNumber(set.rpe) } : {}),
                        completed: Boolean(set.completed),
                    };
                }),
            };
        });

        const summary = await generateWorkoutSummary({
            workoutName: log.workoutName,
            date: (log.endTime || log.startTime).toISOString(),
            durationMin: log.duration,
            gymName: log.gymName,
            totalVolumeKg: Math.round(totalVolumeKg),
            completedSets,
            exercises,
        });

        await WorkoutLog.updateOne({ _id: log._id }, { $set: { aiSummary: summary } });

        return NextResponse.json({ summary });
    } catch (error) {
        console.error('Error generating workout summary:', error);
        return NextResponse.json({ error: 'Failed to generate workout summary' }, { status: 500 });
    }
}
