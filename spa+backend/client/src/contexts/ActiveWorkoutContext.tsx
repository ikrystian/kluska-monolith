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
<<<<<<< HEAD:SPA/src/contexts/ActiveWorkoutContext.tsx
}

/**
 * Hook to access active workout state and mutations.
 * Must be used within an ActiveWorkoutProvider.
 */
export function useActiveWorkout() {
  const context = useActiveWorkoutContext();
  // Here we could extend the context value with mutation wrappers like:
  // const { mutate: updateWorkout } = useUpdateDoc('workoutLogs');
  // const finishWorkout = () => ...

  // For now return the context as is, logic is handled in pages/hooks composition
  return context;
}

=======
}
>>>>>>> 3f020ae (chore: Update project dependencies and remove the `ChatPage.tsx` file.):spa+backend/client/src/contexts/ActiveWorkoutContext.tsx
