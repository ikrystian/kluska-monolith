/**
 * Deterministic numbers for the in-run AI coach (POST /api/athlete/running/coach).
 *
 * A small language model is good at wording and bad at arithmetic, so every
 * pace, time and projection the coach speaks is computed here first. The model
 * only gets these numbers (plus ready-to-read Polish phrasings of them) and
 * writes the tip and the spoken line around them.
 *
 * Paces are seconds per kilometre, times are seconds. `deltaVsPlanS` is
 * positive when the runner is behind the plan, negative when ahead.
 */

export type AdvancedGoal =
    | { kind: 'distance_time'; distanceKm: number; targetTimeS: number }
    | { kind: 'steady_pace'; durationMin: number; targetPaceSPerKm: number | null }
    | { kind: 'negative_split'; distanceKm: number; targetTimeS: number | null }
    | { kind: 'progressive'; distanceKm: number; startPaceSPerKm: number; stepSPerKm: number };

export interface CoachSplit {
    /** 1-based kilometre number. */
    km: number;
    /** Time taken for that kilometre, i.e. its pace in s/km. */
    timeS: number;
    elevationGainM: number;
}

export interface CoachRunInput {
    goal: AdvancedGoal;
    /** Full kilometres completed — the boundary that triggered this call. */
    km: number;
    distanceM: number;
    movingTimeS: number;
    splits: CoachSplit[];
}

export type CoachStatus = 'ahead' | 'on_track' | 'behind' | 'at_risk' | 'achieved';

export interface CoachMetrics {
    goalKind: AdvancedGoal['kind'];
    goalLabel: string;
    kmCompleted: number;
    distanceKm: number;
    movingTimeS: number;
    avgPaceSPerKm: number;
    /** Pace of the kilometre just finished. */
    lastKmPaceSPerKm: number;
    /** Mean of the last two kilometres — steadier than one split for projections. */
    recentPaceSPerKm: number;
    /** The pace the plan expects on average, when the goal defines one. */
    targetPaceSPerKm: number | null;
    /** What the plan expects for the next kilometre. */
    nextKmTargetPaceSPerKm: number | null;
    /** Average pace needed over the rest of the goal to still make it. */
    requiredPaceSPerKm: number | null;
    deltaVsPlanS: number | null;
    projectedFinishS: number | null;
    /** For time-boxed goals: how far the runner gets at the current average pace. */
    projectedDistanceKm: number | null;
    remainingDistanceKm: number | null;
    remainingTimeS: number | null;
    progressPercent: number;
    /** Standard deviation of the split paces — the steadiness measure. */
    paceStdevS: number | null;
    /** Negative split only: average pace of each half so far. */
    firstHalfPaceSPerKm: number | null;
    secondHalfPaceSPerKm: number | null;
    status: CoachStatus;
    goalCompleted: boolean;
    /** The same numbers phrased for text-to-speech ("5 minut 20 sekund na kilometr"). */
    spoken: Record<string, string>;
}

/** No runner holds this; keeps a long progressive plan from asking for the impossible. */
const FASTEST_PLAUSIBLE_PACE_S = 150;
/** Within ±2% of plan counts as on track; beyond 5% behind is at risk. */
const ON_TRACK_TOLERANCE = 0.02;
const AT_RISK_TOLERANCE = 0.05;

const round = (value: number) => Math.round(value);
const round1 = (value: number) => Math.round(value * 10) / 10;
const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

function stdev(values: number[]): number | null {
    if (values.length < 2) return null;
    const avg = mean(values);
    return Math.sqrt(mean(values.map(v => (v - avg) ** 2)));
}

// ---- Polish phrasing ----

function plural(n: number, one: string, few: string, many: string): string {
    const abs = Math.abs(n);
    if (abs === 1) return one;
    const lastTwo = abs % 100;
    const last = abs % 10;
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
    return many;
}

/** "1 godzina 5 minut", "49 minut 30 sekund", "45 sekund". */
export function spokenDuration(totalSeconds: number): string {
    const seconds = Math.max(0, round(totalSeconds));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h} ${plural(h, 'godzina', 'godziny', 'godzin')}`);
    if (m > 0) parts.push(`${m} ${plural(m, 'minuta', 'minuty', 'minut')}`);
    // Seconds are noise once a duration runs past an hour.
    if (s > 0 && h === 0) parts.push(`${s} ${plural(s, 'sekunda', 'sekundy', 'sekund')}`);
    return parts.length ? parts.join(' ') : '0 sekund';
}

export function spokenPace(paceS: number): string {
    return `${spokenDuration(paceS)} na kilometr`;
}

export function spokenDistance(km: number): string {
    if (Number.isInteger(km)) return `${km} ${plural(km, 'kilometr', 'kilometry', 'kilometrów')}`;
    // Fractions take the genitive singular in Polish: "2,5 kilometra".
    return `${km.toFixed(1).replace('.', ',')} kilometra`;
}

const ORDINALS = [
    '', 'pierwszy', 'drugi', 'trzeci', 'czwarty', 'piąty', 'szósty', 'siódmy', 'ósmy', 'dziewiąty', 'dziesiąty',
    'jedenasty', 'dwunasty', 'trzynasty', 'czternasty', 'piętnasty', 'szesnasty', 'siedemnasty', 'osiemnasty',
    'dziewiętnasty',
];
const ORDINAL_TENS = ['', '', 'dwudziesty', 'trzydziesty', 'czterdziesty', 'pięćdziesiąty'];

/** "trzeci kilometr", "dwudziesty pierwszy kilometr"; past fifty just the number. */
export function spokenKilometreOrdinal(km: number): string {
    if (km >= 1 && km < 20) return `${ORDINALS[km]} kilometr`;
    const tens = Math.floor(km / 10);
    if (km >= 20 && tens < ORDINAL_TENS.length) {
        const unit = km % 10;
        return `${ORDINAL_TENS[tens]}${unit ? ` ${ORDINALS[unit]}` : ''} kilometr`;
    }
    return `kilometr numer ${km}`;
}

const STATUS_PHRASES: Record<CoachStatus, string> = {
    ahead: 'szybciej niż plan',
    on_track: 'w granicach planu',
    behind: 'trochę za planem',
    at_risk: 'wyraźnie za planem, cel jest zagrożony',
    achieved: 'cel osiągnięty',
};

function spokenDelta(deltaS: number): string {
    const abs = Math.abs(round(deltaS));
    if (abs < 3) return 'równo z planem';
    return `${spokenDuration(abs)} ${deltaS > 0 ? 'za planem' : 'przed planem'}`;
}

/** Short written pace for labels, e.g. "5:05". */
export function formatPaceShort(paceS: number): string {
    const total = round(paceS);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function formatDurationShort(totalSeconds: number): string {
    const total = round(totalSeconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function describeGoal(goal: AdvancedGoal): string {
    switch (goal.kind) {
        case 'distance_time':
            return `${goal.distanceKm} km w ${formatDurationShort(goal.targetTimeS)} (tempo ${formatPaceShort(goal.targetTimeS / goal.distanceKm)}/km)`;
        case 'steady_pace':
            return goal.targetPaceSPerKm
                ? `${goal.durationMin} min równym tempem ${formatPaceShort(goal.targetPaceSPerKm)}/km`
                : `${goal.durationMin} min równym tempem`;
        case 'negative_split':
            return goal.targetTimeS
                ? `${goal.distanceKm} km negatywnym splitem w ${formatDurationShort(goal.targetTimeS)}`
                : `${goal.distanceKm} km negatywnym splitem`;
        case 'progressive':
            return `${goal.distanceKm} km progresywnie od ${formatPaceShort(goal.startPaceSPerKm)}/km, szybciej o ${goal.stepSPerKm} s co km`;
    }
}

// ---- Status ----

/** `relative` is how much slower than plan (positive) or faster (negative), as a fraction. */
function statusFromRelative(relative: number): CoachStatus {
    if (relative <= -ON_TRACK_TOLERANCE) return 'ahead';
    if (relative < ON_TRACK_TOLERANCE) return 'on_track';
    if (relative <= AT_RISK_TOLERANCE) return 'behind';
    return 'at_risk';
}

/** Planned pace of kilometre `k` (1-based) in a progressive run. */
function progressivePace(goal: Extract<AdvancedGoal, { kind: 'progressive' }>, k: number): number {
    return Math.max(FASTEST_PLAUSIBLE_PACE_S, goal.startPaceSPerKm - goal.stepSPerKm * (k - 1));
}

/** Planned time to cover `km` kilometres of a progressive run, partial kilometres included. */
function progressivePlannedTime(goal: Extract<AdvancedGoal, { kind: 'progressive' }>, km: number): number {
    let total = 0;
    const full = Math.floor(km);
    for (let k = 1; k <= full; k++) total += progressivePace(goal, k);
    const partial = km - full;
    if (partial > 0) total += partial * progressivePace(goal, full + 1);
    return total;
}

export function computeCoachMetrics(input: CoachRunInput): CoachMetrics {
    const { goal } = input;
    const distanceKm = input.distanceM / 1000;
    const movingTimeS = input.movingTimeS;
    const splitPaces = input.splits.map(s => s.timeS).filter(t => t > 0);
    const avgPace = distanceKm > 0 ? movingTimeS / distanceKm : 0;
    const lastKmPace = splitPaces.length ? splitPaces[splitPaces.length - 1] : avgPace;
    const recentPace = splitPaces.length ? mean(splitPaces.slice(-2)) : avgPace;

    const base = {
        goalKind: goal.kind,
        goalLabel: describeGoal(goal),
        kmCompleted: input.km,
        distanceKm: Math.round(distanceKm * 100) / 100,
        movingTimeS: round(movingTimeS),
        avgPaceSPerKm: round(avgPace),
        lastKmPaceSPerKm: round(lastKmPace),
        recentPaceSPerKm: round(recentPace),
        paceStdevS: (() => {
            const sd = stdev(splitPaces);
            return sd == null ? null : round1(sd);
        })(),
    };

    let targetPace: number | null = null;
    let nextKmTarget: number | null = null;
    let requiredPace: number | null = null;
    let delta: number | null = null;
    let projectedFinish: number | null = null;
    let projectedDistance: number | null = null;
    let remainingDistance: number | null = null;
    let remainingTime: number | null = null;
    let progress = 0;
    let status: CoachStatus = 'on_track';
    let goalCompleted = false;
    let firstHalfPace: number | null = null;
    let secondHalfPace: number | null = null;

    switch (goal.kind) {
        case 'distance_time': {
            targetPace = goal.targetTimeS / goal.distanceKm;
            const planned = targetPace * distanceKm;
            delta = movingTimeS - planned;
            remainingDistance = Math.max(goal.distanceKm - distanceKm, 0);
            remainingTime = goal.targetTimeS - movingTimeS;
            progress = distanceKm / goal.distanceKm;
            goalCompleted = remainingDistance <= 0.01;
            projectedFinish = movingTimeS + remainingDistance * recentPace;
            if (!goalCompleted) {
                requiredPace = remainingTime > 0 ? remainingTime / remainingDistance : null;
                nextKmTarget = requiredPace ?? FASTEST_PLAUSIBLE_PACE_S;
            }
            if (goalCompleted) status = movingTimeS <= goal.targetTimeS ? 'achieved' : 'at_risk';
            else if (requiredPace == null) status = 'at_risk';
            else status = statusFromRelative(planned > 0 ? delta / planned : 0);
            break;
        }

        case 'steady_pace': {
            const targetS = goal.durationMin * 60;
            targetPace = goal.targetPaceSPerKm ?? null;
            // Without a set pace, "steady" means holding what the runner settled into.
            const reference = targetPace ?? avgPace;
            nextKmTarget = reference;
            delta = targetPace ? movingTimeS - targetPace * distanceKm : lastKmPace - avgPace;
            remainingTime = Math.max(targetS - movingTimeS, 0);
            progress = movingTimeS / targetS;
            goalCompleted = remainingTime <= 0;
            projectedDistance = avgPace > 0 ? round1(targetS / avgPace) : null;
            const relative = reference > 0 ? (lastKmPace - reference) / reference : 0;
            status = goalCompleted ? 'achieved' : statusFromRelative(relative);
            break;
        }

        case 'negative_split': {
            const half = goal.distanceKm / 2;
            const firstHalf = input.splits.filter(s => s.km <= half).map(s => s.timeS);
            const secondHalf = input.splits.filter(s => s.km > half).map(s => s.timeS);
            firstHalfPace = firstHalf.length ? round(mean(firstHalf)) : null;
            secondHalfPace = secondHalf.length ? round(mean(secondHalf)) : null;
            remainingDistance = Math.max(goal.distanceKm - distanceKm, 0);
            progress = distanceKm / goal.distanceKm;
            goalCompleted = remainingDistance <= 0.01;
            const nextKmInSecondHalf = input.km + 1 > half;

            if (goal.targetTimeS) {
                // First half 1.5% slower than the average, second half 1.5% faster — same total.
                targetPace = goal.targetTimeS / goal.distanceKm;
                const firstPlan = targetPace * 1.015;
                const secondPlan = targetPace * 0.985;
                const planned =
                    Math.min(distanceKm, half) * firstPlan + Math.max(distanceKm - half, 0) * secondPlan;
                delta = movingTimeS - planned;
                remainingTime = goal.targetTimeS - movingTimeS;
                if (!goalCompleted && remainingTime > 0) requiredPace = remainingTime / remainingDistance;
                nextKmTarget = nextKmInSecondHalf ? Math.min(secondPlan, requiredPace ?? secondPlan) : firstPlan;
                projectedFinish = movingTimeS + remainingDistance * recentPace;
                if (goalCompleted) {
                    const splitOk = firstHalfPace != null && secondHalfPace != null && secondHalfPace < firstHalfPace;
                    status = movingTimeS <= goal.targetTimeS && splitOk ? 'achieved' : 'behind';
                } else {
                    status = statusFromRelative(planned > 0 ? delta / planned : 0);
                }
            } else {
                // No time target: the second half just has to beat the first.
                const firstRef = firstHalfPace ?? avgPace;
                // Never ask a runner already beating that margin to slow back down.
                nextKmTarget = nextKmInSecondHalf ? Math.min(firstRef * 0.98, secondHalfPace ?? Infinity) : firstRef;
                projectedFinish = movingTimeS + remainingDistance * recentPace;
                if (secondHalfPace != null && firstHalfPace != null) {
                    delta = secondHalfPace - firstHalfPace;
                    const relative = (secondHalfPace - firstHalfPace * 0.98) / firstHalfPace;
                    status = goalCompleted
                        ? secondHalfPace < firstHalfPace
                            ? 'achieved'
                            : 'behind'
                        : statusFromRelative(relative);
                } else {
                    // Still in the first half: judge steadiness against its own average.
                    const relative = firstRef > 0 ? (lastKmPace - firstRef) / firstRef : 0;
                    status = Math.abs(relative) < AT_RISK_TOLERANCE ? 'on_track' : relative < 0 ? 'ahead' : 'behind';
                }
            }
            break;
        }

        case 'progressive': {
            const plannedNow = progressivePlannedTime(goal, distanceKm);
            const plannedLastKm = progressivePace(goal, Math.max(input.km, 1));
            targetPace = goal.distanceKm > 0 ? progressivePlannedTime(goal, goal.distanceKm) / goal.distanceKm : null;
            delta = movingTimeS - plannedNow;
            remainingDistance = Math.max(goal.distanceKm - distanceKm, 0);
            progress = distanceKm / goal.distanceKm;
            goalCompleted = remainingDistance <= 0.01;
            nextKmTarget = goalCompleted ? null : progressivePace(goal, input.km + 1);
            const plannedTotal = progressivePlannedTime(goal, goal.distanceKm);
            remainingTime = plannedTotal - movingTimeS;
            projectedFinish = movingTimeS + (plannedTotal - plannedNow);
            const relative = (lastKmPace - plannedLastKm) / plannedLastKm;
            status = goalCompleted ? (delta <= 0 ? 'achieved' : 'behind') : statusFromRelative(relative);
            break;
        }
    }

    const metrics: CoachMetrics = {
        ...base,
        targetPaceSPerKm: targetPace != null ? round(targetPace) : null,
        nextKmTargetPaceSPerKm: nextKmTarget != null ? round(Math.max(nextKmTarget, FASTEST_PLAUSIBLE_PACE_S)) : null,
        requiredPaceSPerKm: requiredPace != null ? round(requiredPace) : null,
        deltaVsPlanS: delta != null ? round(delta) : null,
        projectedFinishS: projectedFinish != null ? round(projectedFinish) : null,
        projectedDistanceKm: projectedDistance,
        remainingDistanceKm: remainingDistance != null ? round1(remainingDistance) : null,
        remainingTimeS: remainingTime != null ? round(remainingTime) : null,
        progressPercent: Math.min(100, Math.max(0, round(progress * 100))),
        firstHalfPaceSPerKm: firstHalfPace,
        secondHalfPaceSPerKm: secondHalfPace,
        status,
        goalCompleted,
        spoken: {},
    };
    metrics.spoken = buildSpoken(metrics);
    return metrics;
}

function buildSpoken(m: CoachMetrics): Record<string, string> {
    const spoken: Record<string, string> = {
        ktoryKilometr: spokenKilometreOrdinal(m.kmCompleted),
        status: STATUS_PHRASES[m.status],
        dystans: spokenDistance(m.kmCompleted),
        czasBiegu: spokenDuration(m.movingTimeS),
        srednieTempo: spokenPace(m.avgPaceSPerKm),
        tempoOstatniegoKm: spokenPace(m.lastKmPaceSPerKm),
    };
    if (m.status === 'ahead' && (m.goalKind === 'steady_pace' || (m.goalKind === 'negative_split' && m.secondHalfPaceSPerKm == null))) {
        spoken.status = 'za szybko jak na ten plan';
    } else if (m.goalCompleted && m.status !== 'achieved') {
        spoken.status = 'dystans zaliczony, ale cel tym razem nie wpadł';
    }
    if (m.targetPaceSPerKm != null) spoken.tempoDocelowe = spokenPace(m.targetPaceSPerKm);
    if (m.nextKmTargetPaceSPerKm != null) spoken.tempoNaNastepnyKm = spokenPace(m.nextKmTargetPaceSPerKm);
    if (m.requiredPaceSPerKm != null) spoken.wymaganeTempo = spokenPace(m.requiredPaceSPerKm);
    if (m.deltaVsPlanS != null) {
        spoken.roznicaWzgledemPlanu =
            m.goalKind === 'steady_pace' && m.targetPaceSPerKm == null
                ? `ostatni kilometr ${spokenDuration(Math.abs(m.deltaVsPlanS))} ${m.deltaVsPlanS > 0 ? 'wolniej' : 'szybciej'} niż średnia`
                : m.goalKind === 'negative_split' && m.targetPaceSPerKm == null
                  ? `druga połowa ${spokenDuration(Math.abs(m.deltaVsPlanS))} na kilometr ${m.deltaVsPlanS < 0 ? 'szybsza' : 'wolniejsza'} od pierwszej`
                  : spokenDelta(m.deltaVsPlanS);
    }
    if (m.projectedFinishS != null) spoken.prognozowanyCzasKoncowy = spokenDuration(m.projectedFinishS);
    if (m.projectedDistanceKm != null) spoken.prognozowanyDystans = spokenDistance(m.projectedDistanceKm);
    if (m.remainingDistanceKm != null && m.remainingDistanceKm > 0) {
        spoken.pozostalyDystans = spokenDistance(m.remainingDistanceKm);
    }
    if (m.remainingTimeS != null && m.remainingTimeS > 0 && m.goalKind === 'steady_pace') {
        spoken.pozostalyCzas = spokenDuration(m.remainingTimeS);
    }
    return spoken;
}

/** Plain, humour-free line used when the model is unavailable. */
export function fallbackSpeech(m: CoachMetrics): string {
    const ordinal = m.spoken.ktoryKilometr;
    const parts = [`${ordinal.charAt(0).toUpperCase()}${ordinal.slice(1)} za tobą. Ostatni kilometr ${m.spoken.tempoOstatniegoKm}.`];
    if (m.goalCompleted) {
        parts.push(m.status === 'achieved' ? 'Cel osiągnięty, gratulacje!' : 'Dystans zaliczony, tym razem bez celu czasowego.');
    } else {
        const delta = m.spoken.roznicaWzgledemPlanu;
        if (delta) {
            const isPlanRelative = !delta.startsWith('ostatni') && !delta.startsWith('druga');
            parts.push(isPlanRelative ? `Jesteś ${delta}.` : `${delta.charAt(0).toUpperCase()}${delta.slice(1)}.`);
        }
        if (m.spoken.tempoNaNastepnyKm) parts.push(`Na następny kilometr celuj w ${m.spoken.tempoNaNastepnyKm}.`);
    }
    return parts.join(' ');
}
