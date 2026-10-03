import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { PushSubscription } from '@/models/PushSubscription';

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys, token, platform, userAgent } = body;

    await connectToDatabase();

    if (platform === 'android' || platform === 'ios') {
      if (!token) {
        return NextResponse.json({ error: 'Invalid native push token' }, { status: 400 });
      }
      await PushSubscription.findOneAndUpdate(
        { token },
        { userId: user.id, platform, token, userAgent },
        { upsert: true, new: true }
      );
      return NextResponse.json({ success: true });
    }

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { userId: user.id, platform: 'web', endpoint, keys, userAgent },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
