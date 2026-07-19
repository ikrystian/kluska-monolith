'use client';

import { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR, { mutate as globalMutate, preload } from 'swr';

export interface UseCollectionResult<T> {
  data: T[] | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseDocResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function buildCollectionKey(
  collection: string,
  query?: Record<string, any>,
  options?: { sort?: Record<string, 1 | -1>; limit?: number }
): string {
  const params = new URLSearchParams();
  if (query && Object.keys(query).length > 0) {
    params.append('query', JSON.stringify(query));
  }
  if (options?.sort) params.append('sort', JSON.stringify(options.sort));
  if (options?.limit) params.append('limit', options.limit.toString());
  return `/api/db/${collection}?${params.toString()}`;
}

async function collectionFetcher(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  const result = await response.json();
  return result.data || [];
}

async function docFetcher(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.statusText}`);
  }
  const result = await response.json();
  return result.data || null;
}

/**
 * Revalidate every cached query (lists and single docs) for a collection.
 * Called automatically after create/update/delete so views refresh only
 * when the data actually changed.
 */
export function mutateCollection(collection: string) {
  const prefix = `/api/db/${collection}`;
  return globalMutate(
    (key) =>
      typeof key === 'string' &&
      (key.startsWith(`${prefix}?`) || key.startsWith(`${prefix}/`)),
    undefined,
    { revalidate: true }
  );
}

/**
 * Warm the SWR cache for a collection query before the view mounts.
 * The arguments must match the target useCollection call exactly,
 * otherwise the cache key won't line up.
 */
export function preloadCollection(
  collection: string,
  query?: Record<string, any>,
  options?: { sort?: Record<string, 1 | -1>; limit?: number }
) {
  return preload(buildCollectionKey(collection, query, options), collectionFetcher);
}

/**
 * Warm the SWR cache for a single document before the view mounts.
 */
export function preloadDoc(collection: string, id: string) {
  return preload(`/api/db/${collection}/${id}`, docFetcher);
}

/**
 * Hook to fetch a collection from MongoDB via API.
 *
 * Backed by SWR: results are cached across navigations, so remounting a view
 * renders instantly from cache and revalidates in the background.
 *
 * @param collection - Collection name or null to skip fetching
 * @param query - MongoDB query filter (optional)
 * @param options - Sort and limit options (optional)
 *
 * IMPORTANT: Pass `null` as collection to skip fetching entirely.
 * This is useful when you need to wait for other data before fetching.
 * For the cache to work across visits, query values must be stable between
 * mounts (avoid `new Date()` timestamps — round to day boundaries instead).
 */
export function useCollection<T>(
  collection: string | null,
  query?: Record<string, any>,
  options?: { sort?: Record<string, 1 | -1>; limit?: number }
): UseCollectionResult<T> {
  const key = collection ? buildCollectionKey(collection, query, options) : null;

  const { data, error, isLoading, mutate } = useSWR<T[]>(key, collectionFetcher, {
    keepPreviousData: true,
  });

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    data: data ?? null,
    isLoading,
    error: error instanceof Error ? error : error ? new Error('Unknown error') : null,
    refetch,
  };
}

/**
 * Hook to fetch a single document from MongoDB via API.
 * Cached across navigations the same way as useCollection.
 */
export function useDoc<T>(
  collection: string | null,
  id: string | null
): UseDocResult<T> {
  const key = collection && id ? `/api/db/${collection}/${id}` : null;

  const { data, error, isLoading, mutate } = useSWR<T>(key, docFetcher, {
    keepPreviousData: true,
  });

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    data: data ?? null,
    isLoading,
    error: error instanceof Error ? error : error ? new Error('Unknown error') : null,
    refetch,
  };
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
      const response = await fetch(`/api/db/${collection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create document: ${response.statusText}`);
      }

      const result = await response.json();
      void mutateCollection(collection);
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
      const response = await fetch(`/api/db/${collection}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update document: ${response.statusText}`);
      }

      const result = await response.json();
      void mutateCollection(collection);
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
      const response = await fetch(`/api/db/${collection}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.statusText}`);
      }

      void mutateCollection(collection);
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

/**
 * Hook to access current user from NextAuth session
 */
export function useUser() {
  const { data: session, status } = useSession();

  return {
    user: session?.user ? {
      uid: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    } : null,
    isUserLoading: status === 'loading',
    userError: null,
  };
}
