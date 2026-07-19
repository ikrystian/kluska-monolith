'use client';

import { useEffect } from 'react';
import { preloadCollection, preloadDoc, useDoc, useUser } from '@/lib/db-hooks';
import type { UserProfile } from '@/lib/types';

// Odstęp przed rozgrzaniem cache, żeby zapytania aktywnego widoku miały
// pierwszeństwo w sieci.
const PRELOAD_DELAY_MS = 1500;

/**
 * Warms the SWR cache for the bottom-nav views (dashboard, calendar, log,
 * chat, profile) so switching tabs renders instantly on first visit.
 *
 * IMPORTANT: each preload below must mirror a useCollection/useDoc call in the
 * corresponding view exactly (same object shape and key order), otherwise the
 * cache key won't match and the preload is wasted.
 */
export function usePreloadAthleteViews() {
  const { user } = useUser();
  const { data: userProfile } = useDoc<UserProfile>(user ? 'users' : null, user?.uid || null);

  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;

    const timeout = setTimeout(() => {
      // Kalendarz
      preloadCollection('workoutLogs', { athleteId: uid });
      preloadCollection('plannedWorkouts', { ownerId: uid });
      preloadCollection('exercises');
      preloadCollection('trainingSessions', { athleteId: uid });

      // Trenuj (log)
      preloadCollection('workoutPlans', { assignedAthleteIds: { $in: [uid] } });
      preloadCollection('workoutPlans', { trainerId: uid });
      preloadCollection('workouts', { $or: [{ ownerId: 'public' }, { ownerId: uid }] });
      preloadCollection('workoutLogs', { athleteId: uid, status: 'completed' }, { sort: { endTime: -1 }, limit: 10 });
      preloadCollection('workoutLogs', { athleteId: uid, status: 'in-progress' });

      // Panel (zapytania bez zakresów dat)
      preloadCollection('workoutLogs', { athleteId: uid, status: 'completed' }, { sort: { endTime: -1 }, limit: 5 });
      preloadCollection('goals', { ownerId: uid });
      preloadCollection('bodyMeasurements', { ownerId: uid }, { sort: { date: -1 }, limit: 1 });
      preloadCollection('workoutPlans', { assignedAthleteIds: uid });
      preloadCollection('habits', { ownerId: uid, isActive: true });
      preloadCollection('habitlogs', { ownerId: uid });

      // Profil
      preloadCollection('gyms');
      preloadCollection('runningSessions', { ownerId: uid });
      preloadCollection('stravaActivities', { ownerId: uid });
    }, PRELOAD_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [uid]);

  // Zapytania zależne od profilu (trainerId) — czekają aż profil się wczyta
  useEffect(() => {
    if (!uid || !userProfile) return;

    const trainerId = userProfile.trainerId;

    const timeout = setTimeout(() => {
      // Trenuj — lista ćwiczeń (public + własne + trenera + legacy bez ownera)
      const ownerIds = ['public', uid];
      if (trainerId) ownerIds.push(trainerId);
      preloadCollection('exercises', {
        $or: [
          { ownerId: { $in: ownerIds } },
          { ownerId: { $exists: false } },
          { ownerId: null }
        ]
      });

      // Czat — profil trenera
      if (trainerId) preloadDoc('users', trainerId);
    }, PRELOAD_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [uid, userProfile]);
}
