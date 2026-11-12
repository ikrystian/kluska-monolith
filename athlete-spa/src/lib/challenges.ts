import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { endOfDay } from 'date-fns';
import { apiFetch } from '@/lib/api-client';
import { swrFetcher } from '@/lib/db-hooks';
import { toast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import type { Challenge } from '@/lib/types';
import type { SocialUserSummary } from '@/lib/friends';

/**
 * Running challenges between friends (backend: src/lib/challenges.ts).
 * A race to `targetKm` that starts when the friend accepts: the first to get
 * there wins; at the deadline, more kilometres wins; equal = a draw.
 */

export const CHALLENGE_LIMITS = { minKm: 1, maxKm: 1000, maxDays: 90, messageMaxLength: 140 } as const;

export interface ChallengeView extends Challenge {
  challenger?: SocialUserSummary;
  challenged?: SocialUserSummary;
}

export interface ChallengeRun {
  id: string;
  userId: string;
  date: string;
  distanceKm: number;
  source: 'app' | 'strava';
  title?: string;
}

export interface ChallengeDetail extends ChallengeView {
  runs: ChallengeRun[];
}

export const CHALLENGES_KEY = '/api/challenges';
export const challengeKey = (id: string) => `${CHALLENGES_KEY}/${id}`;
export const challengeHref = (id: string) => `/athlete/challenges/${id}`;

export function useChallenges(enabled = true) {
  return useSWR<ChallengeView[]>(enabled ? CHALLENGES_KEY : null, swrFetcher);
}

export function useChallenge(id: string | null | undefined) {
  return useSWR<ChallengeDetail>(id ? challengeKey(id) : null, swrFetcher);
}

/* ---------- Reading a challenge from one runner's side ---------- */

export interface ChallengeSide {
  user: SocialUserSummary;
  km: number;
  reachedAt?: string;
}

export interface ChallengeSides {
  isChallenger: boolean;
  me: ChallengeSide;
  opponent: ChallengeSide;
}

function resolveUser(
  user?: Partial<SocialUserSummary> | null,
  userId?: string,
  name?: string,
  avatarUrl?: string
): SocialUserSummary {
  return {
    userId: user?.userId || userId || '',
    displayName: user?.displayName || name || 'Zawodnik',
    nickname: user?.nickname,
    avatarUrl: user?.avatarUrl || avatarUrl,
    location: user?.location,
  };
}

export function challengeSides(c: ChallengeView, myId: string): ChallengeSides {
  const challengerUser = resolveUser(c.challenger, c.challengerId, c.challengerName, c.challengerAvatarUrl);
  const challengedUser = resolveUser(c.challenged, c.challengedId, c.challengedName, c.challengedAvatarUrl);
  const challenger: ChallengeSide = { user: challengerUser, km: c.challengerProgress ?? 0, reachedAt: c.challengerReachedAt };
  const challenged: ChallengeSide = { user: challengedUser, km: c.challengedProgress ?? 0, reachedAt: c.challengedReachedAt };
  const isChallenger = c.challengerId === myId;
  return isChallenger
    ? { isChallenger, me: challenger, opponent: challenged }
    : { isChallenger, me: challenged, opponent: challenger };
}

/** Where a challenge belongs in the lists. */
export type ChallengeBucket = 'invite' | 'sent' | 'active' | 'finished' | 'closed';

export function challengeBucket(c: Challenge, myId: string): ChallengeBucket {
  switch (c.status) {
    case 'pending':
      return c.challengedId === myId ? 'invite' : 'sent';
    case 'accepted':
      return 'active';
    case 'completed':
      return 'finished';
    default:
      return 'closed';
  }
}

export type ChallengeResult = 'win' | 'loss' | 'draw';

export function challengeResult(c: Challenge, myId: string): ChallengeResult | null {
  if (c.status !== 'completed') return null;
  if (!c.winnerId) return 'draw';
  return c.winnerId === myId ? 'win' : 'loss';
}

export const CLOSED_LABELS: Record<string, string> = {
  declined: 'Odrzucone',
  cancelled: 'Wycofane',
  expired: 'Wygasło',
};

export function formatChallengeKm(km: number): string {
  return km.toLocaleString('pl-PL', { maximumFractionDigits: km >= 100 ? 0 : 1 });
}

/**
 * Kilometres per day still needed to reach the target by the deadline,
 * or null once there is nothing (or no time) left.
 */
export function kmPerDayNeeded(remainingKm: number, endDate: string, now: Date = new Date()): number | null {
  const msLeft = new Date(endDate).getTime() - now.getTime();
  if (remainingKm <= 0 || msLeft <= 0) return null;
  const days = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  return remainingKm / days;
}

/* ---------- Actions ---------- */

export interface NewChallenge {
  challengedId: string;
  targetKm: number;
  /** The last day of the race; the challenge ends at its local midnight. */
  lastDay: Date;
  message?: string;
}

export type ChallengeAction = 'accept' | 'decline' | 'cancel' | 'forfeit';

const ACTION_TOASTS: Record<ChallengeAction, { title: string; description?: string }> = {
  accept: { title: 'Wyzwanie przyjęte! 🏁', description: 'Liczą się biegi od teraz. Powodzenia!' },
  decline: { title: 'Wyzwanie odrzucone' },
  cancel: { title: 'Wyzwanie wycofane' },
  forfeit: { title: 'Poddano wyzwanie', description: 'Następnym razem pójdzie lepiej.' },
};

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.error === 'string') return body.error;
  } catch {
    /* not JSON */
  }
  return 'Nie udało się wykonać akcji. Spróbuj ponownie.';
}

/** Create / answer / withdraw / give up. Every write revalidates the cached challenge lists (apiFetch). */
export function useChallengeActions() {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const run = useCallback(
    async (key: string, request: () => Promise<Response>, success: { title: string; description?: string }) => {
      setPendingKey(key);
      try {
        const response = await request();
        if (!response.ok) throw new Error(await errorMessage(response));
        const { data } = (await response.json()) as { data: ChallengeView };
        haptic('success');
        toast(success);
        return data;
      } catch (error) {
        haptic('warning');
        toast({
          title: 'Błąd',
          description: error instanceof Error ? error.message : 'Nie udało się wykonać akcji.',
          variant: 'destructive',
        });
        return null;
      } finally {
        setPendingKey(null);
      }
    },
    []
  );

  const create = useCallback(
    (input: NewChallenge, friendName: string) =>
      run(
        'create',
        () =>
          apiFetch(CHALLENGES_KEY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              challengedId: input.challengedId,
              targetKm: input.targetKm,
              endDate: endOfDay(input.lastDay).toISOString(),
              message: input.message?.trim() || undefined,
            }),
          }),
        { title: 'Wyzwanie wysłane! 🏃', description: `${friendName} dostanie powiadomienie.` }
      ),
    [run]
  );

  const respond = useCallback(
    (id: string, action: ChallengeAction) =>
      run(
        `${id}:${action}`,
        () =>
          apiFetch(challengeKey(id), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          }),
        ACTION_TOASTS[action]
      ),
    [run]
  );

  /** Whether `action` (any action when omitted) on challenge `id` is in flight. */
  const isPending = useCallback(
    (id: string, action?: ChallengeAction) =>
      action ? pendingKey === `${id}:${action}` : Boolean(pendingKey?.startsWith(`${id}:`)),
    [pendingKey]
  );

  return { create, respond, isPending, pendingKey };
}
