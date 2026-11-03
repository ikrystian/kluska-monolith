import { useCallback, useMemo, useRef } from 'react';
import { useSWRConfig } from 'swr';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api-client';
import { useDoc, useUser } from '@/lib/db-hooks';
import { haptic } from '@/lib/haptics';
import type { UserProfile } from '@/lib/types';

const EMPTY: string[] = [];

/**
 * The athlete's starred exercises, kept on their user profile
 * (`favoriteExerciseIds`) so they follow them across devices. Toggling updates
 * the cached profile right away and rolls back if the save fails.
 */
export function useFavoriteExercises() {
  const { user } = useUser();
  const { toast } = useToast();
  // Bound to the app's SWR cache — see the note on `useSWRConfig` in Log.tsx.
  const { mutate } = useSWRConfig();
  const { data: profile } = useDoc<UserProfile>('users', user?.uid ?? null);

  const favoriteIds = profile?.favoriteExerciseIds ?? EMPTY;
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  // Quick successive taps must build on each other, not on a stale render.
  const latestRef = useRef(favoriteIds);
  latestRef.current = favoriteIds;

  const toggleFavorite = useCallback(
    async (exerciseId: string) => {
      if (!user?.uid) return;
      const key = `/api/db/users/${user.uid}`;
      const previous = latestRef.current;
      const next = previous.includes(exerciseId)
        ? previous.filter(id => id !== exerciseId)
        : [...previous, exerciseId];
      latestRef.current = next;
      haptic('tap');

      const withFavorites = (ids: string[]) => (current?: UserProfile) =>
        current ? { ...current, favoriteExerciseIds: ids } : current;
      void mutate(key, withFavorites(next), { revalidate: false });

      try {
        const res = await apiFetch(key, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ favoriteExerciseIds: next }),
        });
        if (!res.ok) throw new Error(res.statusText);
      } catch {
        latestRef.current = previous;
        void mutate(key, withFavorites(previous), { revalidate: false });
        toast({ title: 'Nie udało się zapisać ulubionych', variant: 'destructive' });
      }
    },
    [user?.uid, mutate, toast]
  );

  return { favoriteIds, favoriteSet, toggleFavorite };
}
