import { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { apiFetch } from '@/lib/api-client';
import { useFrozenDuringTransition } from '@/lib/page-transition';

export { useUser } from '@/contexts/AuthContext';

export interface UseCollectionResult<T> {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseDocResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

async function swrFetcher(url: string) {
  const response = await apiFetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
  const result = await response.json();
  return result.data;
}

/**
 * Hook to fetch a collection from MongoDB via API
 *
 * Backed by SWR: results are cached globally, so returning to a page renders
 * its content immediately (stale-while-revalidate) instead of re-showing
 * skeletons on every navigation. During a route transition animation the
 * returned snapshot is frozen so data never pops in mid-slide.
 *
 * @param collection - Collection name or null to skip fetching
 * @param query - MongoDB query filter (optional)
 * @param options - Sort and limit options (optional)
 *
 * IMPORTANT: Pass `null` as collection to skip fetching entirely.
 * This is useful when you need to wait for other data before fetching.
 */
export function useCollection<T>(
  collection: string | null,
  query?: Record<string, any>,
  options?: { sort?: Record<string, 1 | -1>; limit?: number }
): UseCollectionResult<T> {
  // Serialize query and options for a stable cache key
  const queryString = query && Object.keys(query).length > 0 ? JSON.stringify(query) : '';
  const sortString = options?.sort ? JSON.stringify(options.sort) : '';
  const limitString = options?.limit ? options.limit.toString() : '';

  const key = useMemo(() => {
    if (!collection) return null;
    const params = new URLSearchParams();
    if (queryString) params.append('query', queryString);
    if (sortString) params.append('sort', sortString);
    if (limitString) params.append('limit', limitString);
    return `/api/db/${collection}?${params.toString()}`;
  }, [collection, queryString, sortString, limitString]);

  const { data, error, isLoading, mutate } = useSWR<T[]>(key, swrFetcher);

  const refetch = useCallback(() => {
    void mutate();
  }, [mutate]);

  const snapshot = useMemo(
    () => ({
      data: data ?? null,
      isLoading,
      error: error instanceof Error ? error : error ? new Error('Unknown error') : null,
    }),
    [data, isLoading, error]
  );

  return { ...useFrozenDuringTransition(snapshot), refetch };
}

/**
 * Hook to fetch a single document from MongoDB via API
 */
export function useDoc<T>(
  collection: string | null,
  id: string | null
): UseDocResult<T> {
  const key = collection && id ? `/api/db/${collection}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR<T>(key, swrFetcher);

  const refetch = useCallback(() => {
    void mutate();
  }, [mutate]);

  const snapshot = useMemo(
    () => ({
      data: data ?? null,
      isLoading,
      error: error instanceof Error ? error : error ? new Error('Unknown error') : null,
    }),
    [data, isLoading, error]
  );

  return { ...useFrozenDuringTransition(snapshot), refetch };
}

/**
 * Hook to create a document
 */
export function useCreateDoc() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createDoc = async (collection: string, data: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/db/${collection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create document: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { createDoc, isLoading, error };
}

/**
 * Hook to update a document
 */
export function useUpdateDoc() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateDoc = async (collection: string, id: string, data: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/db/${collection}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update document: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { updateDoc, isLoading, error };
}

/**
 * Hook to delete a document
 */
export function useDeleteDoc() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteDoc = async (collection: string, id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/db/${collection}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.statusText}`);
      }

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteDoc, isLoading, error };
}
