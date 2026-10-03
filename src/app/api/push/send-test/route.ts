import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { PushSubscription } from '@/models/PushSubscription';
import { sendWebPush } from '@/lib/web-push';

// POST - admin-only: send a test push notification to one or more users'
// subscribed devices. Stale subscriptions (the push service reports them as
// gone) are cleaned up as a side effect.
export async function POST(request: NextRequest) {
  try {
    const requester = await getRequestUser(request);
    if (!requester) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (requester.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userIds, title, body } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds is required' }, { status: 400 });
    }
    if (!title || !body) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
    }

    await connectToDatabase();

    const subscriptions = await PushSubscription.find({ userId: { $in: userIds } });

    if (subscriptions.length === 0) {
      return NextResponse.json({ error: 'Żaden z wybranych użytkowników nie ma aktywnej subskrypcji push' }, { status: 400 });
    }

    const results = await Promise.all(
      subscriptions.map((sub) =>
        sendWebPush(
          { endpoint: sub.endpoint, keys: sub.keys },
          { title, body }
        ).then((result) => ({ ...result, userId: sub.userId }))
      )
    );

    const staleEndpoints = results.filter((r) => r.shouldDelete).map((r) => r.endpoint);
    if (staleEndpoints.length > 0) {
      await PushSubscription.deleteMany({ endpoint: { $in: staleEndpoints } });
    }

    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.length - sentCount;

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      targetedDevices: results.length,
      results,
    });
  } catch (error) {
    console.error('Error sending test push notification:', error);
    return NextResponse.json({ error: 'Failed to send test notification' }, { status: 500 });
  }
}
