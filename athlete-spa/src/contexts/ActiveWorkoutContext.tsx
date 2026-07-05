'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useCollection, useUser } from '@/lib/db-hooks';
import { WorkoutLog } from '@/lib/types';

interface ActiveWorkoutContextType {
  activeWorkout: WorkoutLog | null;
  isLoading: boolean;
  hasActiveWorkout: boolean;
  refetch: () => void;
}

const ActiveWorkoutContext = createContext<ActiveWorkoutContextType | undefined>(undefined);

interface ActiveWorkoutProviderProps {
  children: ReactNode;
}

export function ActiveWorkoutProvider({ children }: ActiveWorkoutProviderProps) {
  const { user } = useUser();

  const { data: activeWorkouts, isLoading, refetch } = useCollection<WorkoutLog>(
    user?.uid ? 'workoutLogs' : null,
    user?.uid ? { athleteId: user.uid, status: 'in-progress' } : undefined,
    { limit: 1 }
  );

  const value = useMemo<ActiveWorkoutContextType>(() => {
    const activeWorkout = activeWorkouts && activeWorkouts.length > 0 ? activeWorkouts[0] : null;
    return {
      activeWorkout,
      isLoading,
      hasActiveWorkout: !!activeWorkout,
      refetch,
    };
  }, [activeWorkouts, isLoading, refetch]);

  return (
    <ActiveWorkoutContext.Provider value={value}>
      {children}
    </ActiveWorkoutContext.Provider>
  );
}

export function useActiveWorkoutContext(): ActiveWorkoutContextType {
  const context = useContext(ActiveWorkoutContext);
  if (context === undefined) {
    throw new Error('useActiveWorkoutContext must be used within an ActiveWorkoutProvider');
  }
  return context;
}