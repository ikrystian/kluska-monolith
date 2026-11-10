import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserSummaries, notifyUser } from '@/lib/friends';
import {
  CHALLENGE_LIMITS,
  areFriends,
  challengeLink,
  formatDeadline,
  formatKm,
  refreshChallenge,
  toChallengeViews,
} from '@/lib/challenges';
import { Challenge } from '@/models';

const MAX_LISTED = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

// GET - The caller's challenges (sent and received), recounted and settled where due.
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const challenges = await Challenge.find({
      $or: [{ challengerId: user.id }, { challengedId: user.id }],
    })
      .sort({ createdAt: -1 })
      .limit(MAX_LISTED);

    const now = new Date();
    const fresh = await Promise.all(challenges.map(challenge => refreshChallenge(challenge, now)));

    return NextResponse.json({ data: await toChallengeViews(fresh) });
  } catch (error) {
    console.error('GET /api/challenges error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Challenge a friend: { challengedId, targetKm, endDate, message? }
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.isGuest) {
      return NextResponse.json({ error: 'Wyzwania są dostępne po założeniu konta.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const challengedId = body?.challengedId;
    const targetKm = Math.round(Number(body?.targetKm) * 10) / 10;
    const endDate = new Date(body?.endDate);
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const now = Date.now();

    if (typeof challengedId !== 'string' || !mongoose.isValidObjectId(challengedId)) {
      return NextResponse.json({ error: 'Wybierz znajomego.' }, { status: 400 });
    }
    if (challengedId === user.id) {
      return NextResponse.json({ error: 'Nie możesz wyzwać samego siebie.' }, { status: 400 });
    }
    if (!Number.isFinite(targetKm) || targetKm < CHALLENGE_LIMITS.minKm || targetKm > CHALLENGE_LIMITS.maxKm) {
      return NextResponse.json(
        { error: `Cel musi mieć od ${CHALLENGE_LIMITS.minKm} do ${CHALLENGE_LIMITS.maxKm} km.` },
        { status: 400 }
      );
    }
    if (Number.isNaN(endDate.getTime()) || endDate.getTime() <= now + 60 * 60 * 1000) {
      return NextResponse.json({ error: 'Termin musi być w przyszłości.' }, { status: 400 });
    }
    // One day of slack: the client sends the end of the chosen day in its own time zone.
    if (endDate.getTime() > now + (CHALLENGE_LIMITS.maxDays + 1) * DAY_MS) {
      return NextResponse.json(
        { error: `Wyzwanie może trwać najwyżej ${CHALLENGE_LIMITS.maxDays} dni.` },
        { status: 400 }
      );
    }
    if (message.length > CHALLENGE_LIMITS.messageMaxLength) {
      return NextResponse.json(
        { error: `Wiadomość może mieć najwyżej ${CHALLENGE_LIMITS.messageMaxLength} znaków.` },
        { status: 400 }
      );
    }

    await connectToDatabase();

    if (!(await areFriends(user.id, challengedId))) {
      return NextResponse.json({ error: 'Wyzwania można wysyłać tylko znajomym.' }, { status: 403 });
    }

    const existing = await Challenge.findOne({
      status: { $in: ['pending', 'accepted'] },
      $or: [
        { challengerId: user.id, challengedId },
        { challengerId: challengedId, challengedId: user.id },
      ],
    });
    // A stale one (deadline passed) is settled here and no longer blocks a new challenge.
    if (existing && ['pending', 'accepted'].includes((await refreshChallenge(existing)).status)) {
      return NextResponse.json(
        { error: 'Masz już otwarte wyzwanie z tą osobą. Dokończcie je najpierw.' },
        { status: 409 }
      );
    }

    const summaries = await getUserSummaries([user.id, challengedId]);
    const me = summaries.get(user.id);
    const friend = summaries.get(challengedId);
    if (!me || !friend) {
      return NextResponse.json({ error: 'Nie znaleziono użytkownika.' }, { status: 404 });
    }

    const challenge = await Challenge.create({
      challengerId: user.id,
      challengedId,
      challengerName: me.displayName,
      challengedName: friend.displayName,
      challengerAvatarUrl: me.avatarUrl,
      challengedAvatarUrl: friend.avatarUrl,
      targetKm,
      message: message || undefined,
      endDate,
      status: 'pending',
      challengerProgress: 0,
      challengedProgress: 0,
    });

    const note = message ? ` „${message}”` : '';
    await notifyUser(
      challengedId,
      'Wyzwanie biegowe 🏃',
      `${me.displayName} rzuca Ci wyzwanie: kto pierwszy przebiegnie ${formatKm(targetKm)} km (do ${formatDeadline(endDate)}).${note}`,
      challengeLink(String(challenge._id)),
      { push: true }
    );

    const [view] = await toChallengeViews([challenge]);
    return NextResponse.json({ data: view }, { status: 201 });
  } catch (error) {
    console.error('POST /api/challenges error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
