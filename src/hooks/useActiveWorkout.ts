'use client';

import { useActiveWorkoutContext } from '@/contexts/ActiveWorkoutContext';

/**
 * Hook to access active workout state.
 * Must be used within an ActiveWorkoutProvider.
 *
 * @returns {Object} Active workout state
 * @returns {WorkoutLog | null} activeWorkout - The current active workout or null
 * @returns {boolean} isLoading - Whether the active workout is being fetched
 * @returns {boolean} hasActiveWorkout - Whether there is an active workout
 * @returns {Function} refetch - Function to refetch the active workout
 */
export function useActiveWorkout() {
  return useActiveWorkoutContext();
}