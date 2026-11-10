import {
  Challenge,
  Friendship,
  RunningSession,
  StravaActivity,
  friendshipPairKey,
  type ChallengeOutcome,
  type IChallenge,
} from '@/models';
import { getUserSummaries, notifyUser, type SocialUserSummary } from '@/lib/friends';
import { grantPoints } from '@/lib/gamification/gamification-service';

/**
 * Running challenges between friends: a race to `targetKm` that starts when
 * the challenged friend accepts. Whoever's runs reach the target first wins;
 * if nobody gets there by the deadline, the one with more kilometres wins
 * (equal kilometres = a draw). Progress is recounted from the runs on every
 * read and after each saved run, so there is no counter to drift or forge.
 */

export const CHALLENGE_LIMITS = {
  minKm: 1,
  maxKm: 1000,
  maxDays: 90,
  messageMaxLength: 140,
} as const;

/** Strava sport types that count as running. */
const STRAVA_RUN_TYPES = ['Run', 'TrailRun', 'VirtualRun'];
/** An app run and a Strava run starting this close together are one run recorded twice. */
const DUPLICATE_WINDOW_MS = 20 * 60 * 1000;
/** Rounding slack so 9.999 km reads as a reached 10 km target. */
const KM_EPSILON = 0.005;
/** Below this gap two distances count as equal (draw, no leader). */
const KM_TIE = 0.01;

export const challengeLink = (id: string) => `/athlete/challenges/${id}`;

export const formatKm = (km: number) => km.toLocaleString('pl-PL', { maximumFractionDigits: 1 });

export const formatDeadline = (date: Date) =>
  date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', timeZone: 'Europe/Warsaw' });

export async function areFriends(a: string, b: string): Promise<boolean> {
  return Boolean(await Friendship.exists({ pairKey: friendshipPairKey(a, b), status: 'accepted' }));
}

/* ---------- Counting runs ---------- */

export interface ChallengeRun {
  id: string;
  userId: string;
  date: Date;
  distanceKm: number;
  source: 'app' | 'strava';
  title?: string;
}

/** Runs of `userIds` dated within [start, end], oldest first, without Strava copies of app runs. */
export async function getChallengeRuns(userIds: string[], start: Date, end: Date): Promise<ChallengeRun[]> {
  if (end < start) return [];
  const window = { $gte: start, $lte: end };

  const [sessions, activities] = await Promise.all([
    RunningSession.find({ ownerId: { $in: userIds }, date: window }).select('ownerId date distance programName').lean(),
    StravaActivity.find({ ownerId: { $in: userIds }, type: { $in: STRAVA_RUN_TYPES }, date: window })
      .select('ownerId date distance name')
      .lean(),
  ]);

  const appRuns: ChallengeRun[] = sessions
    .filter(s => s.distance > 0)
    .map(s => ({
      id: String(s._id),
      userId: s.ownerId,
      date: new Date(s.date),
      distanceKm: s.distance,
      source: 'app' as const,
      title: s.programName,
    }));

  const stravaRuns: ChallengeRun[] = activities
    .filter(a => a.distance > 0)
    .map(a => ({
      id: String(a._id),
      userId: a.ownerId,
      date: new Date(a.date),
      distanceKm: a.distance / 1000,
      source: 'strava' as const,
      title: a.name,
    }));

  // Recording a run in the app with Strava running on the watch must not count it twice.
  const isCopyOfAppRun = (run: ChallengeRun) =>
    appRuns.some(
      app =>
        app.userId === run.userId &&
        Math.abs(app.date.getTime() - run.date.getTime()) <= DUPLICATE_WINDOW_MS &&
        Math.abs(app.distanceKm - run.distanceKm) <= Math.max(0.5, run.distanceKm * 0.15)
    );

  return [...appRuns, ...stravaRuns.filter(run => !isCopyOfAppRun(run))].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
}

interface SideTally {
  km: number;
  /** Date of the run that took this side to the target. */
  reachedAt?: Date;
}

function tally(runs: ChallengeRun[], userId: string, targetKm: number): SideTally {
  let km = 0;
  let reachedAt: Date | undefined;
  for (const run of runs) {
    if (run.userId !== userId) continue;
    km += run.distanceKm;
    if (!reachedAt && km >= targetKm - KM_EPSILON) reachedAt = run.date;
  }
  return { km: Math.round(km * 100) / 100, reachedAt };
}

function moreKm(aId: string, aKm: number, bId: string, bKm: number): string | undefined {
  if (Math.abs(aKm - bKm) < KM_TIE) return undefined;
  return aKm > bKm ? aId : bId;
}

interface Verdict {
  done: boolean;
  winnerId?: string;
  outcome?: ChallengeOutcome;
}

function judge(challenge: IChallenge, challenger: SideTally, challenged: SideTally, now: Date): Verdict {
  const { challengerId, challengedId } = challenge;

  if (challenger.reachedAt || challenged.reachedAt) {
    let winnerId: string | undefined;
    if (challenger.reachedAt && challenged.reachedAt) {
      const diff = challenger.reachedAt.getTime() - challenged.reachedAt.getTime();
      winnerId =
        diff < 0
          ? challengerId
          : diff > 0
            ? challengedId
            : moreKm(challengerId, challenger.km, challengedId, challenged.km);
    } else {
      winnerId = challenger.reachedAt ? challengerId : challengedId;
    }
    return { done: true, winnerId, outcome: 'target' };
  }

  if (challenge.endDate <= now) {
    return {
      done: true,
      winnerId: moreKm(challengerId, challenger.km, challengedId, challenged.km),
      outcome: 'deadline',
    };
  }

  return { done: false };
}

/**
 * FitCoins for the winner. Reaching the target pays 2 per target km (max 100);
 * a win on the deadline pays 1 per km actually run (max 50), so creating
 * challenges nobody runs earns nothing. Giving up pays nobody.
 */
export function challengeRewardPoints(targetKm: number, outcome: ChallengeOutcome, winnerKm: number): number {
  if (outcome === 'target') return Math.min(100, Math.max(2, Math.round(targetKm * 2)));
  if (outcome === 'deadline') return Math.min(50, Math.round(Math.min(winnerKm, targetKm)));
  return 0;
}

/* ---------- Settling ---------- */

const nameOf = (c: IChallenge, userId: string) => (userId === c.challengerId ? c.challengerName : c.challengedName);
const opponentOf = (c: IChallenge, userId: string) => (userId === c.challengerId ? c.challengedId : c.challengerId);
const progressOf = (c: IChallenge, userId: string) =>
  userId === c.challengerId ? c.challengerProgress : c.challengedProgress;

function leaderOf(c: Pick<IChallenge, 'challengerId' | 'challengedId' | 'challengerProgress' | 'challengedProgress'>) {
  return moreKm(c.challengerId, c.challengerProgress, c.challengedId, c.challengedProgress) ?? null;
}

/** Rewards the winner and tells both runners how it ended. Called once per challenge. */
export async function onChallengeSettled(c: IChallenge, options: { forfeitedBy?: string } = {}): Promise<void> {
  const id = String(c._id);
  const link = challengeLink(id);
  const target = formatKm(c.targetKm);

  if (c.winnerId && c.rewardPoints) {
    try {
      await grantPoints(c.winnerId, c.rewardPoints, {
        source: 'challenge_win',
        sourceId: id,
        description: `Wygrane wyzwanie: ${target} km`,
      });
    } catch (error) {
      console.error('Failed to reward challenge win:', error);
    }
  }

  if (!c.winnerId) {
    await Promise.all(
      [c.challengerId, c.challengedId].map(userId =>
        notifyUser(
          userId,
          'Remis w wyzwaniu',
          `Ty i ${nameOf(c, opponentOf(c, userId))} kończycie wyzwanie na ${target} km z takim samym wynikiem.`,
          link,
          { push: true }
        )
      )
    );
    return;
  }

  const winnerId = c.winnerId;
  const loserId = opponentOf(c, winnerId);
  const score = `${formatKm(progressOf(c, winnerId))} vs ${formatKm(progressOf(c, loserId))} km`;
  const reward = c.rewardPoints ? ` +${c.rewardPoints} FitCoinów.` : '';

  const winMessage =
    c.outcome === 'forfeit'
      ? `${nameOf(c, loserId)} poddaje wyzwanie na ${target} km.`
      : c.outcome === 'target'
        ? `Dobiegasz do ${target} km przed ${nameOf(c, loserId)}.${reward}`
        : `Na koniec wyzwania masz więcej kilometrów niż ${nameOf(c, loserId)} (${score}).${reward}`;

  const notifications = [notifyUser(winnerId, 'Wygrane wyzwanie! 🏆', winMessage, link, { push: true })];

  if (options.forfeitedBy !== loserId) {
    const loseMessage =
      c.outcome === 'target'
        ? `${nameOf(c, winnerId)} dobiega do ${target} km przed Tobą. Czas na rewanż?`
        : `${nameOf(c, winnerId)} ma więcej kilometrów na koniec wyzwania (${score}). Czas na rewanż?`;
    notifications.push(
      notifyUser(loserId, `${nameOf(c, winnerId)} wygrywa wyzwanie`, loseMessage, link, { push: true })
    );
  }

  await Promise.all(notifications);
}

/** Tells the runner who just lost the lead; silent while nobody leads or the leader is unchanged. */
async function notifyLeadChange(before: IChallenge, after: IChallenge) {
  const previous = leaderOf(before);
  const next = leaderOf(after);
  if (!next || next === previous) return;

  const trailingId = opponentOf(after, next);
  await notifyUser(
    trailingId,
    `${nameOf(after, next)} prowadzi w wyzwaniu`,
    `${formatKm(progressOf(after, next))} vs ${formatKm(progressOf(after, trailingId))} km, cel: ${formatKm(after.targetKm)} km. Czas na bieg!`,
    challengeLink(String(after._id)),
    { push: true }
  );
}

/**
 * Brings one challenge up to date: expires unanswered invitations, recounts
 * both runners' kilometres and settles the race once it is decided. Every
 * status change is a conditional update, so concurrent refreshes settle (and
 * reward, and notify) a challenge only once.
 */
export async function refreshChallenge(challenge: IChallenge, now: Date = new Date()): Promise<IChallenge> {
  const id = challenge._id;
  const reload = async () => (await Challenge.findById(id)) ?? challenge;

  if (challenge.status === 'pending') {
    if (challenge.endDate > now) return challenge;
    const expired = await Challenge.findOneAndUpdate(
      { _id: id, status: 'pending' },
      { $set: { status: 'expired' } },
      { returnDocument: 'after' }
    );
    if (!expired) return reload();
    await notifyUser(
      expired.challengerId,
      'Wyzwanie wygasło',
      `${expired.challengedName} nie odpowiedział(a) na wyzwanie na ${formatKm(expired.targetKm)} km przed terminem.`,
      challengeLink(String(id))
    );
    return expired;
  }

  if (challenge.status !== 'accepted' || !challenge.startDate) return challenge;

  const end = challenge.endDate < now ? challenge.endDate : now;
  const runs = await getChallengeRuns([challenge.challengerId, challenge.challengedId], challenge.startDate, end);
  const challenger = tally(runs, challenge.challengerId, challenge.targetKm);
  const challenged = tally(runs, challenge.challengedId, challenge.targetKm);
  const verdict = judge(challenge, challenger, challenged, now);
  const progress = { challengerProgress: challenger.km, challengedProgress: challenged.km };

  if (verdict.done) {
    const winnerKm = verdict.winnerId === challenge.challengerId ? challenger.km : challenged.km;
    const set: Record<string, unknown> = {
      ...progress,
      status: 'completed',
      outcome: verdict.outcome,
      completedAt: now,
      rewardPoints: verdict.winnerId ? challengeRewardPoints(challenge.targetKm, verdict.outcome!, winnerKm) : 0,
    };
    if (verdict.winnerId) set.winnerId = verdict.winnerId;
    if (challenger.reachedAt) set.challengerReachedAt = challenger.reachedAt;
    if (challenged.reachedAt) set.challengedReachedAt = challenged.reachedAt;

    const settled = await Challenge.findOneAndUpdate({ _id: id, status: 'accepted' }, { $set: set }, { returnDocument: 'after' });
    if (!settled) return reload();
    await onChallengeSettled(settled);
    return settled;
  }

  if (
    challenger.km === challenge.challengerProgress &&
    challenged.km === challenge.challengedProgress
  ) {
    return challenge;
  }

  // Matching on the old numbers makes the lead-change notification fire once.
  const updated = await Challenge.findOneAndUpdate(
    {
      _id: id,
      status: 'accepted',
      challengerProgress: challenge.challengerProgress,
      challengedProgress: challenge.challengedProgress,
    },
    { $set: progress },
    { returnDocument: 'after' }
  );
  if (!updated) return reload();
  await notifyLeadChange(challenge, updated);
  return updated;
}

/** Recounts every open challenge of `userId` — called after they save or sync a run. Never throws. */
export async function refreshUserChallenges(userId: string): Promise<void> {
  try {
    const open = await Challenge.find({
      status: { $in: ['pending', 'accepted'] },
      $or: [{ challengerId: userId }, { challengedId: userId }],
    });
    await Promise.all(open.map(challenge => refreshChallenge(challenge)));
  } catch (error) {
    console.error('Failed to refresh challenges:', error);
  }
}

/* ---------- Response shape ---------- */

export type ChallengeView = ReturnType<IChallenge['toJSON']> & {
  challenger: SocialUserSummary;
  challenged: SocialUserSummary;
};

/** Challenges as JSON plus each runner's current public identity (nickname, avatar). */
export async function toChallengeViews(challenges: IChallenge[]): Promise<ChallengeView[]> {
  const summaries = await getUserSummaries(challenges.flatMap(c => [c.challengerId, c.challengedId]));
  const identity = (userId: string, name: string, avatarUrl?: string): SocialUserSummary =>
    summaries.get(userId) ?? { userId, displayName: name, avatarUrl };

  return challenges.map(c => ({
    ...c.toJSON(),
    challenger: identity(c.challengerId, c.challengerName, c.challengerAvatarUrl),
    challenged: identity(c.challengedId, c.challengedName, c.challengedAvatarUrl),
  }));
}
