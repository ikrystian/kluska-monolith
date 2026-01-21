import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useCollection } from '@/hooks/useCollection';
import { useAuth } from '@/contexts/AuthContext';
import { WorkoutLog } from '@/types';

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
  const { user } = useAuth();

  const { data: activeWorkouts, isLoading, refetch } = useCollection<WorkoutLog>(
    user?.id ? 'workoutLogs' : null,
    {
      query: user?.id ? { athleteId: user.id, status: 'in-progress' } : undefined,
      limit: 1
    }
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

/**
 * Hook to access active workout state.
 * Must be used within an ActiveWorkoutProvider.
 */
export function useActiveWorkout() {
  return useActiveWorkoutContext();
}
