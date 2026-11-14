'use client';

import { useMemo } from 'react';
import { useCollection } from '@/lib/db-hooks';
import { WorkoutLog } from '@/lib/types';

export interface PreviousSetData {
    weight: number;
    reps: number;
    duration?: number;
    type?: string;
}

export interface ExerciseHistoryData {
    lastWorkoutDate: Date;
    lastWorkoutName: string;
    sets: PreviousSetData[];
}

/**
 * Hook to fetch the most recent workout log containing a specific exercise.
 * Used to show progress comparison during active workout.
 *
 * @param exerciseId - ID of the exercise to find history for
 * @param athleteId - ID of the athlete
 * @returns The last completed workout data for this exercise, or null if none found
 */
export function useExerciseHistory(
    exerciseId: string | null,
    athleteId: string | null
): {
    data: ExerciseHistoryData | null;
    isLoading: boolean;
} {
    // Ask the server for the latest completed log that contains this exercise
    // (indexed on `exercises.exerciseId`), instead of scanning a fixed window of
    // recent logs, which missed anything done more than a few workouts ago.
    const { data: logs, isLoading } = useCollection<WorkoutLog>(
        exerciseId && athleteId ? 'workoutLogs' : null,
        exerciseId && athleteId
            ? {
                athleteId,
                status: 'completed',
                $or: [{ 'exercises.exerciseId': exerciseId }, { 'exercises.exercise._id': exerciseId }],
            }
            : undefined,
        { sort: { endTime: -1 }, limit: 1 }
    );

    const historyData = useMemo(() => {
        if (!logs || !exerciseId) return null;

        for (const log of logs) {
            // The stored snapshot drops the client-side `id` (the schema keeps only
            // `_id`), so match on the series-level `exerciseId` first.
            const exerciseData = log.exercises?.find((ex) => {
                const series = ex as typeof ex & { exerciseId?: string };
                const snapshot = ex.exercise as (typeof ex.exercise & { _id?: unknown }) | undefined;
                return (
                    series.exerciseId === exerciseId ||
                    snapshot?.id === exerciseId ||
                    String(snapshot?._id ?? '') === exerciseId
                );
            });

            if (exerciseData) {
                return {
                    lastWorkoutDate: new Date(log.endTime),
                    lastWorkoutName: log.workoutName,
                    sets: exerciseData.sets.map((set) => ({
                        weight: set.weight || 0,
                        reps: set.reps || 0,
                        duration: set.duration,
                        type: set.type,
                    })),
                };
            }
        }

        return null;
    }, [logs, exerciseId]);

    return {
        data: historyData,
        isLoading,
    };
}
