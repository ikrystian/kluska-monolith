import type { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { GamificationProfile, IGamificationProfile } from '@/models/GamificationProfile';
import { AchievementBadge } from '@/models/AchievementBadge';
import { WorkoutLog } from '@/models/WorkoutLog';
import { Notification } from '@/models/Notification';
import { PushSubscription } from '@/models/PushSubscription';
import { sendWebPush } from '@/lib/web-push';
import { sendNativePush } from '@/lib/firebase-admin';
import { getOrCreateGamificationProfile, grantPoints } from './gamification-service';
import {
  calculateLevelFromXP,
  calculateRunPoints,
  calculateWorkoutPoints,
  streakMilestoneCrossed,
} from './point-calculator';
import { AthleteStats, computeAthleteStats, LogLike } from './stats';
import { buildTracks, evaluateCatalog, getCatalogAchievement, TrackView } from './catalog';
import { AchievementUnlock, requirementMet, requirementValue } from './achievement-checker';
import { GoalCompletion, syncAutoGoals } from './goals';
import { buildQuestViews, pickWeeklyQuests, questProgress, questTitle, QuestView } from './quests';
import { detectPersonalRecords, ExerciseBest } from './records';
import { dayKey, effectiveStreak } from './streaks';

/** Snapshot statystyk starszy niż to jest przeliczany przy odczycie ekranu. */
const SNAPSHOT_TTL_MS = 5 * 60 * 1000;
const PR_BONUS_XP = 25;
const MAX_REWARDED_PRS = 5;

export interface QuestReward {
  id: string;
  title: string;
  xp: number;
}

export interface SyncResult {
  profile: IGamificationProfile;
  stats: AthleteStats;
  unlocked: AchievementUnlock[];
  goalsCompleted: GoalCompletion[];
  quests: QuestReward[];
}

async function ensureWeeklyQuests(profile: IGamificationProfile, stats: AthleteStats): Promise<IGamificationProfile> {
  if (profile.quests?.weekKey === stats.week.weekKey && profile.quests.items?.length) return profile;

  const items = pickWeeklyQuests(stats.baseline);
  // Warunek na weekKey: równoległe żądanie nie nadpisze już wylosowanych wyzwań.
  const updated = await GamificationProfile.findOneAndUpdate(
    { userId: profile.userId, 'quests.weekKey': { $ne: stats.week.weekKey } },
    { $set: { quests: { weekKey: stats.week.weekKey, items } } },
    { new: true }
  );
  return updated ?? (await getOrCreateGamificationProfile(profile.userId));
}

async function rewardCompletedQuests(profile: IGamificationProfile, stats: AthleteStats): Promise<QuestReward[]> {
  const rewards: QuestReward[] = [];

  for (const quest of profile.quests?.items ?? []) {
    if (quest.rewardedAt || questProgress(quest.id, stats.week) < quest.target) continue;

    const claimed = await GamificationProfile.updateOne(
      {
        userId: profile.userId,
        'quests.weekKey': stats.week.weekKey,
        'quests.items': { $elemMatch: { id: quest.id, rewardedAt: { $exists: false } } },
      },
      { $set: { 'quests.items.$.rewardedAt': new Date() } }
    );
    if (claimed.modifiedCount === 0) continue;

    const title = questTitle(quest.id, quest.target);
    await grantPoints(profile.userId, quest.xp, {
      source: 'quest',
      sourceId: `${stats.week.weekKey}:${quest.id}`,
      description: `Wyzwanie tygodnia: ${title}`,
    });
    rewards.push({ id: quest.id, title, xp: quest.xp });
  }

  return rewards;
}

/** Odblokowuje osiągnięcia z katalogu; pętla, bo XP z nagród może podnieść poziom. */
async function unlockCatalog(userId: string, stats: AthleteStats): Promise<AchievementUnlock[]> {
  const unlocked: AchievementUnlock[] = [];

  for (let pass = 0; pass < 4; pass++) {
    const profile = await getOrCreateGamificationProfile(userId);
    const level = calculateLevelFromXP(profile.experiencePoints).level;
    const pending = evaluateCatalog(
      stats,
      level,
      (profile.unlocked ?? []).map(u => u.key)
    );
    if (pending.length === 0) break;

    for (const achievement of pending) {
      const claimed = await GamificationProfile.updateOne(
        { userId, 'unlocked.key': { $ne: achievement.key } },
        { $push: { unlocked: { key: achievement.key, unlockedAt: new Date() } } }
      );
      if (claimed.modifiedCount === 0) continue;

      await grantPoints(userId, achievement.xp, {
        type: 'bonus',
        source: 'achievement',
        sourceId: achievement.key,
        description: `Osiągnięcie: ${achievement.name}`,
      });
      unlocked.push({
        achievementId: achievement.key,
        name: achievement.name,
        description: achievement.description,
        pointsAwarded: achievement.xp,
        rarity: achievement.rarity,
        icon: achievement.icon,
      });
    }
  }

  return unlocked;
}

/** Odznaki zdefiniowane w panelu admina (kolekcja `achievementbadges`). */
async function unlockBadges(userId: string, stats: AthleteStats): Promise<AchievementUnlock[]> {
  const badges = await AchievementBadge.find({ isActive: true });
  if (badges.length === 0) return [];

  const profile = await getOrCreateGamificationProfile(userId);
  const unlocked: AchievementUnlock[] = [];

  for (const badge of badges) {
    const id = badge._id.toString();
    if (profile.achievements.includes(id)) continue;
    if (!requirementMet(requirementValue(profile, stats, badge.requirement), badge.requirement)) continue;

    const claimed = await GamificationProfile.updateOne({ userId, achievements: { $ne: id } }, { $push: { achievements: id } });
    if (claimed.modifiedCount === 0) continue;

    if (badge.pointsReward > 0) {
      await grantPoints(userId, badge.pointsReward, {
        type: 'bonus',
        source: 'achievement',
        sourceId: id,
        description: `Osiągnięcie: ${badge.name}`,
      });
    }
    unlocked.push({
      achievementId: id,
      name: badge.name,
      description: badge.description,
      pointsAwarded: badge.pointsReward,
      rarity: badge.rarity,
      iconUrl: badge.iconUrl,
    });
  }

  return unlocked;
}

/**
 * Serce modułu: przelicza dorobek z realnych danych, a potem cele, wyzwania
 * tygodnia i osiągnięcia. Każda nagroda jest „zajmowana” atomowo, więc
 * równoległe wywołania nie przyznają jej dwa razy.
 */
export async function syncProgress(userId: string): Promise<SyncResult> {
  await connectToDatabase();

  let profile = await getOrCreateGamificationProfile(userId);
  const stats = await computeAthleteStats(userId);

  const goalsCompleted = await syncAutoGoals(userId, stats);
  stats.goalsCompleted += goalsCompleted.length;

  profile = await ensureWeeklyQuests(profile, stats);
  const quests = await rewardCompletedQuests(profile, stats);

  await GamificationProfile.updateOne(
    { userId },
    { $set: { lifetimeStats: stats, statsUpdatedAt: new Date(), 'streaks.workout': stats.currentStreakDays } }
  );

  const unlocked = [...(await unlockCatalog(userId, stats)), ...(await unlockBadges(userId, stats))];

  return { profile: await getOrCreateGamificationProfile(userId), stats, unlocked, goalsCompleted, quests };
}

async function pushToUser(userId: string, title: string, body: string, url: string) {
  const subscriptions = await PushSubscription.find({ userId });
  const results = await Promise.all(
    subscriptions.map(sub =>
      (sub.platform === 'web'
        ? sendWebPush({ endpoint: sub.endpoint!, keys: sub.keys! }, { title, body, url })
        : sendNativePush(sub.token!, { title, body, url })
      ).then(result => ({ stale: result.shouldDelete, id: sub._id }))
    )
  );
  const staleIds = results.filter(r => r.stale).map(r => r.id);
  if (staleIds.length > 0) await PushSubscription.deleteMany({ _id: { $in: staleIds } });
}

/** Powiadomienie o zdobyczach. Nigdy nie rzuca — nie może wywrócić zapisu, który je wywołał. */
async function notifyRewards(
  userId: string,
  result: Pick<SyncResult, 'unlocked' | 'goalsCompleted'>,
  options: { push: boolean }
) {
  try {
    const lines: { title: string; message: string }[] = [];

    if (result.unlocked.length === 1) {
      lines.push({ title: `Nowe osiągnięcie: ${result.unlocked[0].name}`, message: result.unlocked[0].description });
    } else if (result.unlocked.length > 1) {
      lines.push({
        title: `Nowe osiągnięcia: ${result.unlocked.length}`,
        message: result.unlocked
          .slice(0, 3)
          .map(u => u.name)
          .join(', '),
      });
    }
    for (const goal of result.goalsCompleted) {
      lines.push({
        title: `Cel osiągnięty: ${goal.title}`,
        message: goal.points > 0 ? `+${goal.points} pkt do Twojego konta.` : 'Brawo, cel zamknięty!',
      });
    }
    if (lines.length === 0) return;

    const link = '/athlete/goals';
    await Notification.insertMany(
      lines.map(line => ({ userId, type: 'success', ...line, link, isRead: false, metadata: { kind: 'reward' } }))
    );
    if (options.push) await pushToUser(userId, lines[0].title, lines[0].message, link);
  } catch (error) {
    console.error('Failed to notify about rewards:', error);
  }
}

export interface RewardSummary {
  /** Łączne punkty zdobyte przy tym treningu (trening + rekordy + osiągnięcia + cele + wyzwania). */
  xp: number;
  workoutXp: number;
  level: number;
  levelUp: { from: number; to: number } | null;
  streakDays: number;
  streakBonus: number;
  newRecords: ExerciseBest[];
  unlocked: AchievementUnlock[];
  goalsCompleted: GoalCompletion[];
  quests: QuestReward[];
}

type CompletedLog = LogLike & { _id: Types.ObjectId | string; athleteId: string; status?: string };

/**
 * Nagrody za ukończony trening. Idempotentne: `rewardedAt` na logu jest
 * ustawiane atomowo, więc podwójny PATCH ani ponowne zamknięcie nie nagrodzą
 * tego samego treningu drugi raz.
 */
export async function onWorkoutCompleted(
  log: CompletedLog,
  options: { actorId?: string } = {}
): Promise<RewardSummary | null> {
  await connectToDatabase();
  if (log.status !== 'completed') return null;

  const claimed = await WorkoutLog.updateOne(
    { _id: log._id, status: 'completed', rewardedAt: { $exists: false } },
    { $set: { rewardedAt: new Date() } }
  );
  if (claimed.modifiedCount === 0) return null;

  const userId = log.athleteId;
  const before = await getOrCreateGamificationProfile(userId);
  const levelBefore = calculateLevelFromXP(before.experiencePoints).level;
  const streakBefore = effectiveStreak(
    before.lifetimeStats?.currentStreakDays ?? 0,
    before.lifetimeStats?.lastActiveDay,
    dayKey(new Date())
  );

  const newRecords = await detectPersonalRecords(userId, log);

  const workoutXp = calculateWorkoutPoints(log.duration ?? 0, log.exercises?.length ?? 0, false);
  await grantPoints(
    userId,
    workoutXp,
    {
      source: 'workout_completion',
      sourceId: String(log._id),
      description: `Trening ukończony (${Math.round(log.duration ?? 0)} min)`,
    },
    { set: { 'streaks.lastWorkoutDate': new Date() } }
  );

  const rewardedRecords = Math.min(newRecords.length, MAX_REWARDED_PRS);
  if (rewardedRecords > 0) {
    await grantPoints(userId, rewardedRecords * PR_BONUS_XP, {
      type: 'bonus',
      source: 'personal_record',
      sourceId: String(log._id),
      description:
        rewardedRecords === 1 ? `Rekord życiowy: ${newRecords[0].exerciseName}` : `Rekordy życiowe: ${newRecords.length}`,
    });
  }

  const sync = await syncProgress(userId);

  const streakBonus = streakMilestoneCrossed(streakBefore, sync.stats.currentStreakDays);
  let after = sync.profile;
  if (streakBonus > 0) {
    after = (
      await grantPoints(userId, streakBonus, {
        type: 'bonus',
        source: 'streak_bonus',
        description: `Seria ${sync.stats.currentStreakDays} dni z rzędu`,
      })
    ).profile;
  }

  const levelAfter = calculateLevelFromXP(after.experiencePoints).level;
  const summary: RewardSummary = {
    xp: after.totalPointsEarned - before.totalPointsEarned,
    workoutXp,
    level: levelAfter,
    levelUp: levelAfter > levelBefore ? { from: levelBefore, to: levelAfter } : null,
    streakDays: sync.stats.currentStreakDays,
    streakBonus,
    newRecords,
    unlocked: sync.unlocked,
    goalsCompleted: sync.goalsCompleted,
    quests: sync.quests,
  };

  const achievedAt = new Date(log.endTime ?? Date.now()).toISOString();
  await WorkoutLog.updateOne(
    { _id: log._id },
    {
      $set: {
        rewards: summary,
        newRecords: newRecords.map(record => ({
          ...record,
          athleteId: userId,
          workoutLogId: String(log._id),
          achievedAt,
        })),
      },
    }
  );

  // Push tylko gdy trening zamknął ktoś inny (trener) — sam użytkownik widzi podsumowanie na ekranie,
  // więc jego osiągnięcia nie czekają już na osobną celebrację.
  const closedByOther = Boolean(options.actorId && options.actorId !== userId);
  if (!closedByOther) await markAchievementsSeen(userId);
  await notifyRewards(userId, sync, { push: closedByOther });

  return summary;
}

/** Punkty za zapisany bieg + synchronizacja celów i osiągnięć. */
export async function onRunLogged(userId: string, run: { _id: unknown; distance?: number }): Promise<void> {
  try {
    const points = calculateRunPoints(run.distance ?? 0);
    await grantPoints(userId, points, {
      source: 'run_completion',
      sourceId: String(run._id),
      description: `Bieg: ${(run.distance ?? 0).toFixed(1)} km`,
    });
    const sync = await syncProgress(userId);
    await notifyRewards(userId, sync, { push: false });
  } catch (error) {
    console.error('Failed to reward run:', error);
  }
}

/** Lżejszy wariant dla pozostałych aktywności (pomiary, nawyki): sama synchronizacja. */
export async function onActivityLogged(userId: string): Promise<void> {
  try {
    const sync = await syncProgress(userId);
    await notifyRewards(userId, sync, { push: false });
  } catch (error) {
    console.error('Failed to sync gamification progress:', error);
  }
}

export interface GamificationOverview {
  profile: {
    level: number;
    currentXP: number;
    xpForNextLevel: number;
    totalPointsEarned: number;
    currentFitCoins: number;
    streakDays: number;
    longestStreakDays: number;
    achievementCount: number;
    achievementTotal: number;
  };
  stats: AthleteStats;
  tracks: TrackView[];
  quests: { weekKey: string; items: QuestView[] };
  /** Odblokowane, których użytkownik jeszcze nie widział — do celebracji. */
  unseen: AchievementUnlock[];
  recentPoints: { amount: number; source: string; description: string; createdAt: string }[];
}

/** Jeden odczyt dla ekranu „Cele i nagrody”. */
export async function getOverview(userId: string): Promise<GamificationOverview> {
  await connectToDatabase();

  let profile = await getOrCreateGamificationProfile(userId);
  let stats = profile.lifetimeStats as AthleteStats | undefined;

  const todayKey = dayKey(new Date());
  const stale =
    !stats ||
    !profile.statsUpdatedAt ||
    Date.now() - new Date(profile.statsUpdatedAt).getTime() > SNAPSHOT_TTL_MS ||
    dayKey(profile.statsUpdatedAt) !== todayKey;

  if (stale || !stats) {
    const sync = await syncProgress(userId);
    profile = sync.profile;
    stats = sync.stats;
  }

  const levelInfo = calculateLevelFromXP(profile.experiencePoints);
  const tracks = buildTracks(stats, levelInfo.level, profile.unlocked ?? []);

  const unseen = (profile.unlocked ?? [])
    .filter(entry => !entry.seenAt)
    .map(entry => getCatalogAchievement(entry.key))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .map(entry => ({
      achievementId: entry.key,
      name: entry.name,
      description: entry.description,
      pointsAwarded: entry.xp,
      rarity: entry.rarity,
      icon: entry.icon,
    }));

  return {
    profile: {
      level: levelInfo.level,
      currentXP: levelInfo.currentXP,
      xpForNextLevel: levelInfo.xpForNextLevel,
      totalPointsEarned: profile.totalPointsEarned,
      currentFitCoins: profile.currentFitCoins,
      streakDays: effectiveStreak(stats.currentStreakDays, stats.lastActiveDay, todayKey),
      longestStreakDays: stats.longestStreakDays,
      achievementCount: tracks.reduce((sum, track) => sum + track.unlockedCount, 0),
      achievementTotal: tracks.reduce((sum, track) => sum + track.tiers.length, 0),
    },
    stats,
    tracks,
    quests: {
      weekKey: profile.quests?.weekKey ?? stats.week.weekKey,
      items: buildQuestViews(profile.quests?.items ?? [], stats.week),
    },
    unseen,
    recentPoints: [...profile.pointTransactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15)
      .map(t => ({
        amount: t.amount,
        source: t.source,
        description: t.description,
        createdAt: new Date(t.createdAt).toISOString(),
      })),
  };
}

/** Oznacza wszystkie odblokowane osiągnięcia jako obejrzane (po celebracji). */
export async function markAchievementsSeen(userId: string): Promise<void> {
  await connectToDatabase();
  await GamificationProfile.updateOne(
    { userId },
    { $set: { 'unlocked.$[entry].seenAt': new Date() } },
    { arrayFilters: [{ 'entry.seenAt': { $exists: false } }] }
  );
}
