import mongoose from 'mongoose';
import { Friendship, Notification, PushSubscription, SocialProfile, User } from '@/models';
import { sendWebPush } from '@/lib/web-push';
import { sendNativePush } from '@/lib/firebase-admin';

/** Public-facing identity of a user in the social features (no email or other private data). */
export interface SocialUserSummary {
  userId: string;
  /** Social nickname when set up, otherwise the user's first name. */
  displayName: string;
  nickname?: string;
  avatarUrl?: string;
  location?: string;
}

export type FriendRelation = 'none' | 'friends' | 'outgoing' | 'incoming';

/** Ids of everyone with an accepted friendship with `userId`. */
export async function getFriendIds(userId: string): Promise<string[]> {
  const friendships = await Friendship.find({
    status: 'accepted',
    $or: [{ requesterId: userId }, { recipientId: userId }],
  })
    .select('requesterId recipientId')
    .lean();

  return friendships.map(f => (f.requesterId === userId ? f.recipientId : f.requesterId));
}

/**
 * Builds display summaries for the given user ids, preferring the social
 * profile (nickname + avatar) and falling back to the account's first name.
 */
export async function getUserSummaries(userIds: string[]): Promise<Map<string, SocialUserSummary>> {
  const ids = [...new Set(userIds)].filter(id => mongoose.isValidObjectId(id));
  const result = new Map<string, SocialUserSummary>();
  if (ids.length === 0) return result;

  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: ids } }).select('name avatarUrl location').lean(),
    SocialProfile.find({ userId: { $in: ids } }).select('userId nickname avatarUrl').lean(),
  ]);

  const profileByUser = new Map(profiles.map(p => [p.userId, p]));

  for (const user of users) {
    const userId = String(user._id);
    const profile = profileByUser.get(userId);
    result.set(userId, {
      userId,
      displayName: profile?.nickname || user.name?.split(' ')[0] || 'Sportowiec',
      nickname: profile?.nickname,
      avatarUrl: profile?.avatarUrl || user.avatarUrl || undefined,
      location: user.location?.trim() || undefined,
    });
  }

  return result;
}

/** In-app notification for friend events; failures never break the request that triggered it. */
export async function notifyUser(userId: string, title: string, message: string, link: string) {
  try {
    await Notification.create({ userId, type: 'info', title, message, link, isRead: false });
  } catch (error) {
    console.error('Failed to create friend notification:', error);
  }
}

/**
 * Tells every accepted friend of `userId` about a finished activity: an in-app
 * notification plus a push to their registered devices. Never throws — a
 * failed fan-out must not fail the save that triggered it.
 */
export async function notifyFriendsOfActivity(userId: string, message: string) {
  try {
    const friendIds = await getFriendIds(userId);
    if (friendIds.length === 0) return;

    const name = (await getUserSummaries([userId])).get(userId)?.displayName ?? 'Znajomy';
    const title = `${name}: nowa aktywność`;
    const body = `${name} ${message}`;
    const url = '/athlete/dashboard';

    await Notification.insertMany(
      friendIds.map(id => ({ userId: id, type: 'info', title, message: body, link: url, isRead: false }))
    );

    const subscriptions = await PushSubscription.find({ userId: { $in: friendIds } });
    const results = await Promise.all(
      subscriptions.map(sub =>
        sub.platform === 'web'
          ? sendWebPush({ endpoint: sub.endpoint!, keys: sub.keys! }, { title, body, url }).then(r => ({
              stale: r.shouldDelete,
              id: sub._id,
            }))
          : sendNativePush(sub.token!, { title, body, url }).then(r => ({ stale: r.shouldDelete, id: sub._id }))
      )
    );
    const staleIds = results.filter(r => r.stale).map(r => r.id);
    if (staleIds.length > 0) await PushSubscription.deleteMany({ _id: { $in: staleIds } });
  } catch (error) {
    console.error('Failed to notify friends of activity:', error);
  }
}

/** Describes a saved workout/run for the friends' notification, or null if it isn't a finished activity. */
export function describeFinishedActivity(collection: string, doc: Record<string, any>): string | null {
  if (collection === 'workoutLogs' && doc.status === 'completed') {
    const duration = doc.duration ? ` (${Math.round(doc.duration)} min)` : '';
    const place = doc.gymName ? ` w ${doc.gymName}` : '';
    return `zakończył(a) trening „${doc.workoutName}”${duration}${place}.`;
  }
  if (collection === 'runningSessions' && typeof doc.distance === 'number') {
    return `zakończył(a) bieg: ${doc.distance.toFixed(1)} km w ${Math.round(doc.duration ?? 0)} min.`;
  }
  return null;
}
