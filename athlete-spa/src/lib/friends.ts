import { useCallback, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { apiFetch } from '@/lib/api-client';
import { swrFetcher } from '@/lib/db-hooks';
import { toast } from '@/hooks/use-toast';

/** Public identity of a user in the social features (backend: src/lib/friends.ts). */
export interface SocialUserSummary {
  userId: string;
  displayName: string;
  nickname?: string;
  avatarUrl?: string;
  location?: string;
}

export type FriendRelation = 'none' | 'friends' | 'outgoing' | 'incoming';

export interface AthleteListItem extends SocialUserSummary {
  sameArea: boolean;
  relation: FriendRelation;
  friendshipId?: string;
}

export interface FriendEntry {
  friendshipId: string;
  since: string;
  user: SocialUserSummary;
}

export interface FriendsData {
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
}

export interface FriendActivityItem {
  id: string;
  type: 'workout' | 'run' | 'strava' | 'status';
  userId: string;
  date: string;
  title: string;
  distanceKm?: number;
  durationMin?: number;
  exerciseCount?: number;
  sport?: string;
  text?: string;
  user: SocialUserSummary;
}

export interface FriendStatusPost {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  author: SocialUserSummary;
}

export const SOCIAL_KEYS = {
  athletes: '/api/social/athletes',
  friends: '/api/social/friends',
  activity: '/api/social/friends/activity',
  statuses: '/api/social/statuses',
} as const;

export function useAthletes(enabled = true) {
  return useSWR<AthleteListItem[]>(enabled ? SOCIAL_KEYS.athletes : null, swrFetcher);
}

export function useFriends(enabled = true) {
  return useSWR<FriendsData>(enabled ? SOCIAL_KEYS.friends : null, swrFetcher);
}

export function useFriendsActivity(enabled = true) {
  return useSWR<FriendActivityItem[]>(enabled ? SOCIAL_KEYS.activity : null, swrFetcher);
}

export function useFriendStatuses(enabled = true) {
  return useSWR<FriendStatusPost[]>(enabled ? SOCIAL_KEYS.statuses : null, swrFetcher);
}

/** Invite / accept / remove, revalidating every friend-dependent list afterwards. */
export function useFriendActions() {
  // The app uses a custom SWR cache provider, so only the config-bound mutate
  // reaches it (the global `mutate` export from 'swr' is a no-op here).
  const { mutate } = useSWRConfig();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const run = useCallback(
    async (key: string, request: () => Promise<Response>, successMessage: string) => {
      setPendingKey(key);
      try {
        const response = await request();
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        toast({ title: successMessage });
        await Promise.all(Object.values(SOCIAL_KEYS).map(k => mutate(k)));
        return true;
      } catch (error) {
        console.error('Friend action failed:', error);
        toast({
          title: 'Błąd',
          description: 'Nie udało się wykonać akcji. Spróbuj ponownie.',
          variant: 'destructive',
        });
        return false;
      } finally {
        setPendingKey(null);
      }
    },
    [mutate]
  );

  const invite = useCallback(
    (userId: string) =>
      run(
        userId,
        () =>
          apiFetch(SOCIAL_KEYS.friends, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          }),
        'Zaproszenie wysłane'
      ),
    [run]
  );

  const accept = useCallback(
    (friendshipId: string) =>
      run(
        friendshipId,
        () =>
          apiFetch(`${SOCIAL_KEYS.friends}/${friendshipId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'accept' }),
          }),
        'Zaproszenie przyjęte'
      ),
    [run]
  );

  const remove = useCallback(
    (friendshipId: string, successMessage: string) =>
      run(
        friendshipId,
        () => apiFetch(`${SOCIAL_KEYS.friends}/${friendshipId}`, { method: 'DELETE' }),
        successMessage
      ),
    [run]
  );

  return { invite, accept, remove, pendingKey };
}
