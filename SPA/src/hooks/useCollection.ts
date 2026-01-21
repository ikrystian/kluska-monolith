import { useQuery } from '@tanstack/react-query';
import { fetchCollection } from '@/api/db';

export interface UseCollectionOptions {
  query?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

/**
 * Hook to fetch a collection from MongoDB via API using TanStack Query
 *
 * @param collection - Collection name or null to skip fetching
 * @param options - Query options including filter, sort, limit
 *
 * @example
 * // Fetch all workouts for current user
 * const { data, isLoading, error } = useCollection<Workout>('workouts', {
 *   query: { userId: user?.uid },
 *   sort: { createdAt: -1 },
 *   limit: 10
 * });
 */
export function useCollection<T>(
  collection: string | null,
  options: UseCollectionOptions = {}
) {
  const { query, sort, limit, enabled = true, staleTime = 30000, refetchOnWindowFocus = true } = options;

  // Create stable query key
  const queryKey = ['collection', collection, query, sort, limit];

  return useQuery<T[], Error>({
    queryKey,
    queryFn: async () => {
      if (!collection) return [];
      return fetchCollection<T>(collection, { query, sort, limit });
    },
    enabled: enabled && !!collection,
    staleTime,
    refetchOnWindowFocus,
  });
}

export default useCollection;
