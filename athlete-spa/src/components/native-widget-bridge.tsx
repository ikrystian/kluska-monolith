import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import useSWR from 'swr';
import { addDays, format, isSameDay, startOfDay, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import type { GamificationStats } from '@/hooks/useGamification';
import { jsonFetcher, useCollection, useUser } from '@/lib/db-hooks';
import {
  ensureWorkoutWidget,
  isLiveWidgetSupported,
  publishUpNext,
  publishWeeklyStats,
  stopWorkoutWidget,
  type UpNextWorkout,
  type WeeklyStats,
} from '@/lib/live-widget';
import type { PlannedWorkout, RunningSession, StravaActivity, WorkoutLog } from '@/lib/types';

const WIDGET_URL_PREFIX = 'leniwakluska.com://app';
const WINDOW_DAYS = 7;
/** How far ahead planned workouts are handed to the widget. */
const UP_NEXT_DAYS = 14;
/** A few spares, so the widget still has a next one after today's start time passes. */
const UP_NEXT_LIMIT = 5;

/** The launch intent is replayed to every listener; act on it once per process. */
let launchUrlHandled = false;

/** "leniwakluska.com://app/athlete/log?logId=1" → "/athlete/log?logId=1"; anything else → null. */
function widgetPathFromUrl(url: string): string | null {
  if (!url.startsWith(WIDGET_URL_PREFIX)) return null;
  const path = url.slice(WIDGET_URL_PREFIX.length);
  return path.startsWith('/athlete') ? path : null;
}

/**
 * Opens the screen the widget's buttons point at (the workout, its finish
 * step, the run recorder). Mounted at the app root rather than in the athlete
 * layout so it also works while the athlete sits on a full-screen page such as
 * the run recorder, which renders without the layout.
 */
export function NativeWidgetLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLiveWidgetSupported()) return;

    let cancelled = false;
    const open = (url: string) => {
      const path = widgetPathFromUrl(url);
      if (path) navigate(path);
    };

    if (!launchUrlHandled) {
      launchUrlHandled = true;
      App.getLaunchUrl()
        .then(launch => {
          if (!cancelled && launch?.url) open(launch.url);
        })
        .catch(() => undefined);
    }
    const listener = App.addListener('appUrlOpen', ({ url }) => open(url));

    return () => {
      cancelled = true;
      void listener.then(handle => handle.remove());
    };
  }, [navigate]);

  return null;
}

function computeWeeklyStats(
  workouts: WorkoutLog[],
  runs: RunningSession[],
  stravaActivities: StravaActivity[],
  streak: number
): WeeklyStats {
  const today = new Date();
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => startOfDay(subDays(today, WINDOW_DAYS - 1 - i)));
  const counts = days.map(() => 0);

  /** Counts an entry on its day; false when it falls outside the window. */
  const log = (iso: string): boolean => {
    const at = new Date(iso);
    const index = Number.isNaN(at.getTime()) ? -1 : days.findIndex(day => isSameDay(day, at));
    if (index < 0) return false;
    counts[index] += 1;
    return true;
  };

  let workoutCount = 0;
  let volumeKg = 0;
  let distanceKm = 0;
  let activeMinutes = 0;

  for (const workout of workouts) {
    if (!log(workout.endTime)) continue;
    workoutCount += 1;
    activeMinutes += workout.duration ?? 0;
    for (const series of workout.exercises) {
      if (series.exercise?.type !== 'weight') continue;
      for (const set of series.sets) volumeKg += (set.reps || 0) * (set.weight || 0);
    }
  }
  for (const run of runs) {
    if (!log(run.date)) continue;
    distanceKm += run.distance;
    activeMinutes += run.duration;
  }
  for (const activity of stravaActivities) {
    if (!log(activity.date)) continue;
    distanceKm += activity.distance / 1000;
    activeMinutes += activity.movingTime / 60;
  }

  return {
    workouts: workoutCount,
    volumeKg: Math.round(volumeKg),
    distanceKm: Math.round(distanceKm * 10) / 10,
    activeMinutes: Math.round(activeMinutes),
    days: days.map((day, i) => ({ label: format(day, 'EEEEE', { locale: pl }).toUpperCase(), count: counts[i] })),
    streak,
  };
}

function toUpNext(planned: PlannedWorkout[]): UpNextWorkout[] {
  return planned
    .map(plan => ({ plan, at: Date.parse(plan.date) }))
    .filter(({ at }) => !Number.isNaN(at))
    .sort((a, b) => a.at - b.at)
    .slice(0, UP_NEXT_LIMIT)
    .map(({ plan, at }) => {
      // Scheduled from a saved workout → start it; anything else only has the calendar entry.
      const workoutId = (plan as { workoutId?: string }).workoutId;
      return {
        title: plan.workoutName || 'Trening',
        at,
        exercises: plan.exercises?.length ?? 0,
        openPath: workoutId
          ? `/athlete/log?workoutId=${workoutId}`
          : `/athlete/calendar?date=${format(new Date(at), 'yyyy-MM-dd')}`,
      };
    });
}

/** Keeps the widget's "last 7 days" face current — it is what the home screen shows between workouts. */
function useWeeklyStatsPublisher() {
  const { user } = useUser();
  const userId = isLiveWidgetSupported() ? user?.uid : undefined;

  // The window slides with the calendar; re-key it when the app comes back on a new day.
  const [dayKey, setDayKey] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const since = useMemo(() => startOfDay(subDays(new Date(), WINDOW_DAYS - 1)).toISOString(), [dayKey]);

  const workouts = useCollection<WorkoutLog>(
    userId ? 'workoutLogs' : null,
    { athleteId: userId, status: 'completed' },
    { sort: { endTime: -1 }, limit: 30 }
  );
  const runs = useCollection<RunningSession>(userId ? 'runningSessions' : null, { ownerId: userId, date: { $gte: since } });
  const strava = useCollection<StravaActivity>(userId ? 'stravaActivities' : null, { ownerId: userId, date: { $gte: since } });
  // Same key as useGamificationProfile, so the two share one cached read.
  const gamification = useSWR<GamificationStats>(userId ? '/api/gamification/profile' : null, jsonFetcher);
  const streak = gamification.data?.streaks?.workout ?? 0;

  const refetchRef = useRef<Array<() => void>>([]);
  refetchRef.current = [workouts.refetch, runs.refetch, strava.refetch, () => void gamification.mutate()];

  // Going to the home screen is when the widget gets looked at: catch up with
  // anything saved this session (a run, a synced activity) before it does.
  useEffect(() => {
    if (!userId) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        refetchRef.current.forEach(refetch => refetch());
      } else {
        setDayKey(format(new Date(), 'yyyy-MM-dd'));
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [userId]);

  const loaded = !workouts.isLoading && !runs.isLoading && !strava.isLoading;
  const statsJson = useMemo(
    () =>
      loaded
        ? JSON.stringify(computeWeeklyStats(workouts.data ?? [], runs.data ?? [], strava.data ?? [], streak))
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loaded, workouts.data, runs.data, strava.data, streak, dayKey]
  );

  useEffect(() => {
    if (statsJson) void publishWeeklyStats(JSON.parse(statsJson) as WeeklyStats);
  }, [statsJson]);

  return dayKey;
}

/** Keeps the widget's "next workout" row current; the widget drops the ones whose time has passed. */
function useUpNextPublisher(dayKey: string) {
  const { user } = useUser();
  const userId = isLiveWidgetSupported() ? user?.uid : undefined;

  const range = useMemo(() => {
    const today = startOfDay(new Date());
    return { from: today.toISOString(), to: addDays(today, UP_NEXT_DAYS).toISOString() };
  }, [dayKey]);

  const planned = useCollection<PlannedWorkout>(
    userId ? 'plannedWorkouts' : null,
    { ownerId: userId, date: { $gte: range.from, $lte: range.to } },
    { sort: { date: 1 } }
  );

  const upNextJson = useMemo(
    () => (planned.isLoading ? null : JSON.stringify(toUpNext(planned.data ?? []))),
    [planned.isLoading, planned.data]
  );

  useEffect(() => {
    if (upNextJson) void publishUpNext(JSON.parse(upNextJson) as UpNextWorkout[]);
  }, [upNextJson]);
}

/**
 * The database is the source of truth for "a workout is in progress": show it
 * on the widget even when the workout screen isn't open, and take it off when
 * the workout stops existing (discarded, saved elsewhere). The workout screen
 * enriches the same session with set progress while it is mounted.
 */
function useActiveWorkoutSession() {
  const { activeWorkout, isLoading } = useActiveWorkout();
  const id = activeWorkout?.id ?? null;
  const title = activeWorkout?.workoutName || 'Trening';
  const startedAt = Date.parse(activeWorkout?.startTime ?? '');
  const hadWorkoutRef = useRef(false);

  useEffect(() => {
    if (!isLiveWidgetSupported() || isLoading) return;
    if (id) {
      hadWorkoutRef.current = true;
      void ensureWorkoutWidget({
        title,
        startedAt: Number.isNaN(startedAt) ? Date.now() : startedAt,
        openPath: `/athlete/log?logId=${id}`,
        finishPath: `/athlete/log?logId=${id}&finish=true`,
      });
    } else if (hadWorkoutRef.current) {
      // Only a workout seen here and now gone counts — an empty first read can
      // just be the workout screen creating it, which owns its own session.
      hadWorkoutRef.current = false;
      void stopWorkoutWidget();
    }
  }, [id, isLoading, title, startedAt]);
}

/**
 * What the home-screen widget needs from the athlete's data and isn't tied to
 * one screen: weekly stats, streak and the next planned workout while idle,
 * and the in-progress workout. Needs the ActiveWorkoutProvider. Renders nothing.
 */
export function NativeWidgetBridge() {
  const dayKey = useWeeklyStatsPublisher();
  useUpNextPublisher(dayKey);
  useActiveWorkoutSession();
  return null;
}
