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
    // Fetch completed workout logs sorted by endTime descending
    const { data: logs, isLoading } = useCollection<WorkoutLog>(
        exerciseId && athleteId ? 'workoutLogs' : null,
        exerciseId && athleteId ? { athleteId, status: 'completed' } : undefined,
        { sort: { endTime: -1 }, limit: 20 } // Fetch last 20 to find one with this exercise
    );

    const historyData = useMemo(() => {
        if (!logs || !exerciseId) return null;

        // Find the most recent log containing this exercise
        for (const log of logs) {
            const exerciseData = log.exercises?.find(
                (ex) => ex.exercise?.id === exerciseId
            );

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
