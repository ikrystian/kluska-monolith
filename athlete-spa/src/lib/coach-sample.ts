import { DEFAULT_PACE_S, type AdvancedGoal, type AdvancedGoalTarget } from '@/lib/advanced-goal';

/**
 * Made-up run data for the coach's test button on the run screen: lets the
 * whole path (backend → model → ElevenLabs → playback, natively on Android)
 * be heard without running a kilometre. Each tap is the next kilometre of a
 * plausible run toward the selected goal.
 */

export interface CoachSplitPayload {
  km: number;
  timeS: number;
  elevationGainM: number;
}

/** The body of POST /api/athlete/running/coach. */
export interface CoachRunPayload {
  goal: AdvancedGoalTarget;
  km: number;
  distanceM: number;
  movingTimeS: number;
  splits: CoachSplitPayload[];
  previousSpeech?: string | null;
}

/** A fixed wobble around the plan: behind it mid-run, a little ahead by the finish. */
const PACE_WOBBLE_S = [6, -4, 9, -8, 3, 10, -6, 5, -9, -12];
const CLIMB_M = [2, 5, 0, 8, 3, 1, 6, 0];

function plannedPace(goal: AdvancedGoalTarget, km: number): number {
  switch (goal.kind) {
    case 'distance_time':
      return goal.targetTimeS / goal.distanceKm;
    case 'steady_pace':
      return goal.targetPaceSPerKm ?? DEFAULT_PACE_S;
    case 'negative_split': {
      const base = goal.targetTimeS ? goal.targetTimeS / goal.distanceKm : DEFAULT_PACE_S;
      return km <= goal.distanceKm / 2 ? base * 1.015 : base * 0.985;
    }
    case 'progressive':
      return Math.max(150, goal.startPaceSPerKm - goal.stepSPerKm * (km - 1));
  }
}

/** How many kilometres the sample run has; the last one reaches the goal. */
export function sampleKmCount(goal: AdvancedGoalTarget): number {
  if (goal.kind === 'steady_pace') {
    return Math.max(1, Math.ceil((goal.durationMin * 60) / (goal.targetPaceSPerKm ?? DEFAULT_PACE_S)));
  }
  return Math.max(1, Math.round(goal.distanceKm));
}

export function buildSampleCoachPayload(goal: AdvancedGoal, km: number, previousSpeech: string | null): CoachRunPayload {
  const { voiceCoach: _voiceCoach, ...target } = goal;
  const splits: CoachSplitPayload[] = [];
  for (let k = 1; k <= km; k++) {
    splits.push({
      km: k,
      timeS: Math.round(plannedPace(target, k) + PACE_WOBBLE_S[(k - 1) % PACE_WOBBLE_S.length]),
      elevationGainM: CLIMB_M[(k - 1) % CLIMB_M.length],
    });
  }
  let movingTimeS = splits.reduce((total, split) => total + split.timeS, 0);
  let distanceM = km * 1000 + 4;

  // On the last sample kilometre, cover the whole goal so the finish line is heard too.
  if (target.kind !== 'steady_pace' && km >= sampleKmCount(target)) {
    const goalM = target.distanceKm * 1000;
    if (goalM > distanceM) {
      movingTimeS += ((goalM - distanceM) / 1000) * plannedPace(target, km + 1);
      distanceM = goalM;
    }
  }

  return { goal: target, km, distanceM: Math.round(distanceM), movingTimeS: Math.round(movingTimeS), splits, previousSpeech };
}
