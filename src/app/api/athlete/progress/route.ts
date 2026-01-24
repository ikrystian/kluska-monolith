import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { WorkoutLog } from '@/models/WorkoutLog';
import { BodyMeasurement } from '@/models/BodyMeasurement';
import { findBest1RM } from '@/lib/one-rm';

interface VolumeTrend {
    date: string;
    volume: number;
    workoutCount: number;
}

interface OneRMTrend {
    date: string;
    exerciseName: string;
    weight: number;
    reps: number;
    estimated1RM: number;
}

interface BodyWeightEntry {
    date: string;
    weight: number;
}

interface CircumferencesEntry {
    date: string;
    biceps?: number;
    chest?: number;
    waist?: number;
    hips?: number;
    thigh?: number;
    calf?: number;
    neck?: number;
}

interface ProgressResponse {
    volumeTrends: VolumeTrend[];
    estimatedOneRM: Record<string, OneRMTrend[]>;
    bodyWeight: BodyWeightEntry[];
    circumferences: CircumferencesEntry[];
    summary: {
        totalVolume: number;
        volumeChange: number;
        workoutCount: number;
        topExercises: Array<{ name: string; volume: number }>;
    };
}

function getDateRange(period: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
        case '7d':
            startDate.setDate(endDate.getDate() - 7);
            break;
        case '30d':
            startDate.setDate(endDate.getDate() - 30);
            break;
        case '90d':
            startDate.setDate(endDate.getDate() - 90);
            break;
        case '1y':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
        case 'all':
        default:
            startDate.setFullYear(2000); // Effectively all data
            break;
    }

    return { startDate, endDate };
}

function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const athleteId = session.user.id;
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || '30d';

        await dbConnect();

        const { startDate, endDate } = getDateRange(period);

        // Fetch completed workout logs
        const workoutLogs = await WorkoutLog.find({
            athleteId,
            status: 'completed',
            endTime: { $gte: startDate, $lte: endDate },
        }).sort({ endTime: 1 }).lean();

        // Fetch body measurements
        const bodyMeasurements = await BodyMeasurement.find({
            ownerId: athleteId,
            date: { $gte: startDate, $lte: endDate },
        }).sort({ date: 1 }).lean();

        // Calculate volume trends (grouped by date)
        const volumeByDate: Record<string, { volume: number; workoutCount: number }> = {};
        const exerciseOneRM: Record<string, OneRMTrend[]> = {};
        const exerciseVolumes: Record<string, number> = {};

        for (const log of workoutLogs) {
            if (!log.endTime) continue; // Skip logs without endTime
            const dateKey = formatDate(new Date(log.endTime));

            if (!volumeByDate[dateKey]) {
                volumeByDate[dateKey] = { volume: 0, workoutCount: 0 };
            }
            volumeByDate[dateKey].workoutCount++;

            for (const exerciseSeries of log.exercises) {
                const exercise = exerciseSeries.exercise;
                if (!exercise || exercise.type !== 'weight') continue;

                const exerciseId = exerciseSeries.exerciseId || exercise._id?.toString() || exercise.name;
                const exerciseName = exercise.name;

                // Calculate volume for this exercise
                let exerciseVolume = 0;
                for (const set of exerciseSeries.sets) {
                    if (set.completed && set.weight && set.reps) {
                        exerciseVolume += set.weight * set.reps;
                    }
                }
                volumeByDate[dateKey].volume += exerciseVolume;
                exerciseVolumes[exerciseName] = (exerciseVolumes[exerciseName] || 0) + exerciseVolume;

                // Calculate best 1RM for this exercise in this workout
                const best1RM = findBest1RM(exerciseSeries.sets);
                if (best1RM) {
                    if (!exerciseOneRM[exerciseId]) {
                        exerciseOneRM[exerciseId] = [];
                    }

                    // Find the set that produced this 1RM estimate
                    let bestSet = { weight: 0, reps: 0 };
                    for (const set of exerciseSeries.sets) {
                        if (set.weight && set.reps) {
                            const thisRM = findBest1RM([set]);
                            if (thisRM && Math.abs(thisRM - best1RM) < 0.1) {
                                bestSet = { weight: set.weight, reps: set.reps };
                                break;
                            }
                        }
                    }

                    exerciseOneRM[exerciseId].push({
                        date: dateKey,
                        exerciseName,
                        weight: bestSet.weight,
                        reps: bestSet.reps,
                        estimated1RM: best1RM,
                    });
                }
            }
        }

        // Convert volume by date to array
        const volumeTrends: VolumeTrend[] = Object.entries(volumeByDate)
            .map(([date, data]) => ({
                date,
                volume: Math.round(data.volume),
                workoutCount: data.workoutCount,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Calculate total volume and change
        const totalVolume = volumeTrends.reduce((sum, v) => sum + v.volume, 0);

        // Split period in half to calculate change
        const midpoint = Math.floor(volumeTrends.length / 2);
        const firstHalfVolume = volumeTrends.slice(0, midpoint).reduce((sum, v) => sum + v.volume, 0);
        const secondHalfVolume = volumeTrends.slice(midpoint).reduce((sum, v) => sum + v.volume, 0);
        const volumeChange = firstHalfVolume > 0
            ? Math.round(((secondHalfVolume - firstHalfVolume) / firstHalfVolume) * 100)
            : 0;

        // Top exercises by volume
        const topExercises = Object.entries(exerciseVolumes)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, volume]) => ({ name, volume: Math.round(volume) }));

        // Format body measurements
        const bodyWeight: BodyWeightEntry[] = bodyMeasurements.map(m => ({
            date: formatDate(new Date(m.date)),
            weight: m.weight,
        }));

        const circumferences: CircumferencesEntry[] = bodyMeasurements.map(m => ({
            date: formatDate(new Date(m.date)),
            ...m.circumferences,
        }));

        const response: ProgressResponse = {
            volumeTrends,
            estimatedOneRM: exerciseOneRM,
            bodyWeight,
            circumferences,
            summary: {
                totalVolume,
                volumeChange,
                workoutCount: workoutLogs.length,
                topExercises,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching progress data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch progress data' },
            { status: 500 }
        );
    }
}
