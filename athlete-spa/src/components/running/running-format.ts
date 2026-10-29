import type { RunningSession, StravaActivity } from '@/lib/types';
import { formatPaceSec } from '@/lib/run-pace';

/** Manual/tracked sessions and Strava activities normalised to km and minutes. */
export interface RunActivity {
  id: string;
  date: Date;
  distanceKm: number;
  durationMin: number;
  /** min/km */
  avgPace: number;
  source: 'app' | 'strava';
  title?: string;
  notes?: string;
  polyline?: string;
  programName?: string;
  /** Where the activity's detail page lives; manual entries without a route have none. */
  href?: string;
  elevationGain?: number;
  averageHeartrate?: number;
  kudosCount?: number;
}

export function fromSession(session: RunningSession): RunActivity {
  return {
    id: session.id,
    date: new Date(session.date),
    distanceKm: session.distance,
    durationMin: session.duration,
    avgPace: session.avgPace,
    source: 'app',
    notes: session.notes,
    polyline: session.polyline,
    programName: session.programName,
    href: session.polyline ? `/athlete/running/${session.id}` : undefined,
  };
}

export function fromStrava(activity: StravaActivity): RunActivity {
  const distanceKm = activity.distance / 1000;
  const durationMin = activity.movingTime / 60;
  return {
    id: activity.id,
    date: new Date(activity.date),
    distanceKm,
    durationMin,
    avgPace: distanceKm > 0 ? durationMin / distanceKm : 0,
    source: 'strava',
    title: activity.name,
    polyline: activity.map?.summaryPolyline,
    href: `/athlete/running/strava/${activity.stravaActivityId}`,
    elevationGain: activity.totalElevationGain,
    averageHeartrate: activity.averageHeartrate,
    kudosCount: activity.kudosCount,
  };
}

/** `5:12 /km`, or a dash when the pace is unknown. */
export function formatPace(minPerKm: number): string {
  const formatted = formatPaceSec(minPerKm * 60);
  return formatted === '–' ? formatted : `${formatted} /km`;
}

/** `28:30` under an hour, `1:02:30` above. */
export function formatClock(minutes: number): string {
  const total = Math.round(minutes * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** `12 h 40 min` / `45 min` — for totals, where seconds are noise. */
export function formatHours(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

export function formatKm(km: number, digits = 2): string {
  return km.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const TIME_OF_DAY: [number, string][] = [
  [5, 'Nocny'],
  [11, 'Poranny'],
  [14, 'Południowy'],
  [18, 'Popołudniowy'],
  [22, 'Wieczorny'],
  [24, 'Nocny'],
];

/** Strava name, else the training, else e.g. "Poranny bieg". */
export function runTitle(run: RunActivity): string {
  if (run.title) return run.title;
  if (run.programName) return run.programName;
  const hour = run.date.getHours();
  const label = TIME_OF_DAY.find(([until]) => hour < until)?.[1] ?? 'Nocny';
  return `${label} bieg`;
}
