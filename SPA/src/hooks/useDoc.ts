import { useQuery } from '@tanstack/react-query';
import { fetchDocument } from '@/api/db';

export interface UseDocOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

/**
 * Hook to fetch a single document from MongoDB via API using TanStack Query
 *
 * @param collection - Collection name or null to skip fetching
 * @param id - Document ID or null to skip fetching
 * @param options - Query options
 *
 * @example
 * // Fetch a specific workout
 * const { data, isLoading, error } = useDoc<Workout>('workouts', workoutId);
 */
export function useDoc<T>(
  collection: string | null,
  id: string | null,
  options: UseDocOptions = {}
) {
  const { enabled = true, staleTime = 30000, refetchOnWindowFocus = true } = options;

  // Create stable query key
  const queryKey = ['document', collection, id];

  return useQuery<T | null, Error>({
    queryKey,
    queryFn: async () => {
      if (!collection || !id) return null;
      return fetchDocument<T>(collection, id);
    },
    enabled: enabled && !!collection && !!id,
    staleTime,
    refetchOnWindowFocus,
  });
}

export default useDoc;
