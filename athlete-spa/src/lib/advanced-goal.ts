/**
 * Advanced run goals — "10 km in 50 min", "40 min at an even pace" — that the
 * athlete composes from preset options in StartRunDialog. During such a run
 * the AI coach (hooks/useRunCoach.ts, natively RunCoach.java) reports progress
 * every kilometre. The shape mirrors the backend's validator in
 * src/app/api/athlete/running/coach/route.ts — keep both in sync.
 *
 * Paces are seconds per kilometre, times seconds.
 */

export type AdvancedGoalTarget =
  | { kind: 'distance_time'; distanceKm: number; targetTimeS: number }
  | { kind: 'steady_pace'; durationMin: number; targetPaceSPerKm: number | null }
  | { kind: 'negative_split'; distanceKm: number; targetTimeS: number | null }
  | { kind: 'progressive'; distanceKm: number; startPaceSPerKm: number; stepSPerKm: number };

export type AdvancedGoalKind = AdvancedGoalTarget['kind'];

export type AdvancedGoal = AdvancedGoalTarget & {
  /** Spoken AI feedback every kilometre. */
  voiceCoach: boolean;
};

// ---- Preset options the builder offers ----

export const DISTANCE_PRESETS_KM = [3, 5, 10, 15, 21.1, 42.2];
export const DURATION_PRESETS_MIN = [20, 30, 40, 45, 60, 90];
export const STEP_PRESETS_S = [5, 10, 15];
export const PACE_MIN_S = 180;
export const PACE_MAX_S = 540;
export const PACE_STEP_S = 5;
export const DEFAULT_PACE_S = 330;

export const GOAL_KIND_META: Record<AdvancedGoalKind, { title: string; example: string }> = {
  distance_time: { title: 'Dystans w czasie', example: 'np. 10 km w 50 min' },
  steady_pace: { title: 'Równe tempo', example: 'np. 40 min równo' },
  negative_split: { title: 'Negatywny split', example: 'druga połowa szybciej' },
  progressive: { title: 'Bieg progresywny', example: 'każdy km szybciej' },
};

// ---- Formatting ----

/** `5:05` (no unit). */
export function formatPaceS(paceS: number): string {
  const total = Math.round(paceS);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** `50:00` under an hour, `1:45:00` above. */
export function formatDurationS(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatGoalKm(km: number): string {
  return km.toLocaleString('pl-PL', { maximumFractionDigits: 1 });
}

/** Average pace the goal asks for, when it defines one. */
export function targetPaceOf(goal: AdvancedGoalTarget): number | null {
  switch (goal.kind) {
    case 'distance_time':
      return goal.targetTimeS / goal.distanceKm;
    case 'steady_pace':
      return goal.targetPaceSPerKm;
    case 'negative_split':
      return goal.targetTimeS ? goal.targetTimeS / goal.distanceKm : null;
    case 'progressive': {
      // Mean of the planned per-km paces.
      const n = Math.max(1, Math.ceil(goal.distanceKm));
      const last = goal.startPaceSPerKm - goal.stepSPerKm * (n - 1);
      return (goal.startPaceSPerKm + Math.max(150, last)) / 2;
    }
  }
}

/** Planned pace of the last kilometre of a progressive run. */
export function progressiveFinalPace(goal: Extract<AdvancedGoalTarget, { kind: 'progressive' }>): number {
  return Math.max(150, goal.startPaceSPerKm - goal.stepSPerKm * (Math.max(1, Math.ceil(goal.distanceKm)) - 1));
}

/** One line for headers: "10 km w 50:00 · 5:00/km". */
export function describeGoal(goal: AdvancedGoalTarget): string {
  switch (goal.kind) {
    case 'distance_time':
      return `${formatGoalKm(goal.distanceKm)} km w ${formatDurationS(goal.targetTimeS)} · ${formatPaceS(goal.targetTimeS / goal.distanceKm)}/km`;
    case 'steady_pace':
      return goal.targetPaceSPerKm
        ? `${goal.durationMin} min równo · ${formatPaceS(goal.targetPaceSPerKm)}/km`
        : `${goal.durationMin} min równym tempem`;
    case 'negative_split':
      return goal.targetTimeS
        ? `${formatGoalKm(goal.distanceKm)} km negatywnym splitem · ${formatDurationS(goal.targetTimeS)}`
        : `${formatGoalKm(goal.distanceKm)} km negatywnym splitem`;
    case 'progressive':
      return `${formatGoalKm(goal.distanceKm)} km progresywnie · ${formatPaceS(goal.startPaceSPerKm)} → ${formatPaceS(progressiveFinalPace(goal))}/km`;
  }
}

/** 0…1+, distance-based except for the time-boxed steady run. */
export function goalProgressFraction(goal: AdvancedGoalTarget, distanceM: number, durationS: number): number {
  if (goal.kind === 'steady_pace') return durationS / (goal.durationMin * 60);
  return distanceM / 1000 / goal.distanceKm;
}

export function goalRemainingLabel(goal: AdvancedGoalTarget, distanceM: number, durationS: number): string {
  if (goal.kind === 'steady_pace') {
    return `${formatDurationS(Math.max(goal.durationMin * 60 - durationS, 0))} do celu`;
  }
  const remaining = Math.max(goal.distanceKm - distanceM / 1000, 0);
  return `${remaining.toFixed(2)} km do celu`;
}

// ---- Validation, URL and persistence ----

const isNum = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

/** Accepts only a well-formed goal within the backend's limits; anything else is null. */
export function sanitizeAdvancedGoal(raw: unknown): AdvancedGoal | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  const voiceCoach = g.voiceCoach !== false;
  switch (g.kind) {
    case 'distance_time':
      if (!isNum(g.distanceKm, 0.5, 100) || !isNum(g.targetTimeS, 60, 86_400)) return null;
      return { kind: 'distance_time', distanceKm: g.distanceKm, targetTimeS: g.targetTimeS, voiceCoach };
    case 'steady_pace':
      if (!isNum(g.durationMin, 5, 600)) return null;
      if (g.targetPaceSPerKm != null && !isNum(g.targetPaceSPerKm, 150, 900)) return null;
      return {
        kind: 'steady_pace',
        durationMin: g.durationMin,
        targetPaceSPerKm: (g.targetPaceSPerKm as number | null | undefined) ?? null,
        voiceCoach,
      };
    case 'negative_split':
      if (!isNum(g.distanceKm, 1, 100)) return null;
      if (g.targetTimeS != null && !isNum(g.targetTimeS, 60, 86_400)) return null;
      return {
        kind: 'negative_split',
        distanceKm: g.distanceKm,
        targetTimeS: (g.targetTimeS as number | null | undefined) ?? null,
        voiceCoach,
      };
    case 'progressive':
      if (!isNum(g.distanceKm, 1, 100) || !isNum(g.startPaceSPerKm, 150, 900) || !isNum(g.stepSPerKm, 1, 60)) {
        return null;
      }
      return {
        kind: 'progressive',
        distanceKm: g.distanceKm,
        startPaceSPerKm: g.startPaceSPerKm,
        stepSPerKm: g.stepSPerKm,
        voiceCoach,
      };
    default:
      return null;
  }
}

export const ADVANCED_GOAL_PARAM = 'advancedGoal';

export function encodeAdvancedGoal(goal: AdvancedGoal): string {
  return encodeURIComponent(JSON.stringify(goal));
}

/** `value` as read from URLSearchParams (already URI-decoded). */
export function parseAdvancedGoal(value: string | null): AdvancedGoal | null {
  if (!value) return null;
  try {
    return sanitizeAdvancedGoal(JSON.parse(value));
  } catch {
    return null;
  }
}

/**
 * The run screen is reopened without its query string (from the lock-screen
 * notification or the widget, see native-run-bridge), so the goal of the run
 * in progress is kept here too.
 */
const ACTIVE_GOAL_KEY = 'athlete-spa:active-advanced-goal';

export function saveActiveGoal(goal: AdvancedGoal): void {
  try {
    localStorage.setItem(ACTIVE_GOAL_KEY, JSON.stringify(goal));
  } catch {
    // Storage unavailable — the goal just won't survive reopening the screen.
  }
}

export function loadActiveGoal(): AdvancedGoal | null {
  try {
    return parseAdvancedGoal(localStorage.getItem(ACTIVE_GOAL_KEY));
  } catch {
    return null;
  }
}

export function clearActiveGoal(): void {
  try {
    localStorage.removeItem(ACTIVE_GOAL_KEY);
  } catch {
    // Nothing to clear.
  }
}
