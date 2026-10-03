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

    const { endpoint, token } = await request.json();
    await connectToDatabase();

    if (endpoint) {
      // Only the owning user may remove their own subscription.
      await PushSubscription.deleteOne({ endpoint, userId: user.id });
    } else if (token) {
      await PushSubscription.deleteOne({ token, userId: user.id });
    } else {
      // Neither supplied — the caller lost track of it (e.g. storage was
      // cleared); drop every subscription this user has instead.
      await PushSubscription.deleteMany({ userId: user.id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}
