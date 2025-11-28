'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

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

/**
 * Hook to fetch a collection from MongoDB via API
 */
export function useCollection<T>(
  collection: string | null,
  query?: Record<string, any>,
  options?: { sort?: Record<string, 1 | -1>; limit?: number }
): UseCollectionResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { data: session } = useSession();

  const fetchData = useCallback(async () => {
    if (!collection) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (query) params.append('query', JSON.stringify(query));
      if (options?.sort) params.append('sort', JSON.stringify(options.sort));
      if (options?.limit) params.append('limit', options.limit.toString());

      const response = await fetch(`/api/db/${collection}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${collection}: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [collection, JSON.stringify(query), JSON.stringify(options)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

/**
 * Hook to fetch a single document from MongoDB via API
 */
export function useDoc<T>(
  collection: string | null,
  id: string | null
): UseDocResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!collection || !id) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/db/${collection}/${id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result.data || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [collection, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
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

