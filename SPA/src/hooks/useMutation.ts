import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { createDocument, updateDocument, deleteDocument } from '@/api/db';

/**
 * Hook to create a document with automatic cache invalidation
 *
 * @example
 * const { mutate, isPending } = useCreateDoc<Workout>('workouts');
 * mutate({ name: 'New Workout', exercises: [] });
 */
export function useCreateDoc<T>(
  collection: string,
  options?: Omit<UseMutationOptions<T, Error, Partial<T>>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation<T, Error, Partial<T>>({
    mutationFn: (data) => createDocument<T>(collection, data),
    onSuccess: () => {
      // Invalidate collection queries to refetch
      queryClient.invalidateQueries({ queryKey: ['collection', collection] });
    },
    ...options,
  });
}

/**
 * Hook to update a document with automatic cache invalidation
 *
 * @example
 * const { mutate, isPending } = useUpdateDoc<Workout>('workouts');
 * mutate({ id: 'workout-id', data: { name: 'Updated Name' } });
 */
export function useUpdateDoc<T>(
  collection: string,
  options?: Omit<UseMutationOptions<T, Error, { id: string; data: Partial<T> }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation<T, Error, { id: string; data: Partial<T> }>({
    mutationFn: ({ id, data }) => updateDocument<T>(collection, id, data),
    onSuccess: (_, variables) => {
      // Invalidate both collection and specific document queries
      queryClient.invalidateQueries({ queryKey: ['collection', collection] });
      queryClient.invalidateQueries({ queryKey: ['document', collection, variables.id] });
    },
    ...options,
  });
}

/**
 * Hook to delete a document with automatic cache invalidation
 *
 * @example
 * const { mutate, isPending } = useDeleteDoc('workouts');
 * mutate('workout-id');
 */
export function useDeleteDoc(
  collection: string,
  options?: Omit<UseMutationOptions<boolean, Error, string>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, string>({
    mutationFn: (id) => deleteDocument(collection, id),
    onSuccess: (_, id) => {
      // Invalidate collection and remove specific document from cache
      queryClient.invalidateQueries({ queryKey: ['collection', collection] });
      queryClient.removeQueries({ queryKey: ['document', collection, id] });
    },
    ...options,
  });
}

export { useCreateDoc as default };
