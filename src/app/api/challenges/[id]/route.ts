import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { notifyUser } from '@/lib/friends';
import {
  challengeLink,
  formatKm,
  getChallengeRuns,
  onChallengeSettled,
  refreshChallenge,
  toChallengeViews,
} from '@/lib/challenges';
import { Challenge, type IChallenge } from '@/models';

type Params = { params: Promise<{ id: string }> };

async function findOwnChallenge(id: string, userId: string): Promise<IChallenge | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  return Challenge.findOne({ _id: id, $or: [{ challengerId: userId }, { challengedId: userId }] });
}

/** Runs that counted (or count) towards the race, newest first. */
async function countedRuns(challenge: IChallenge) {
  if (!challenge.startDate || !['accepted', 'completed'].includes(challenge.status)) return [];
  const now = new Date();
  const candidates = [challenge.endDate, now, challenge.completedAt].filter((d): d is Date => Boolean(d));
  const end = new Date(Math.min(...candidates.map(d => d.getTime())));
  const runs = await getChallengeRuns([challenge.challengerId, challenge.challengedId], challenge.startDate, end);
  return runs.reverse().map(run => ({
    id: run.id,
    userId: run.userId,
    date: run.date,
    distanceKm: Math.round(run.distanceKm * 100) / 100,
    source: run.source,
    title: run.title,
  }));
}

// GET - One challenge with both runners' counted runs.
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await params;
    const found = await findOwnChallenge(id, user.id);
    if (!found) {
      return NextResponse.json({ error: 'Nie znaleziono wyzwania.' }, { status: 404 });
    }

    const challenge = await refreshChallenge(found);
    const [[view], runs] = await Promise.all([toChallengeViews([challenge]), countedRuns(challenge)]);

    return NextResponse.json({ data: { ...view, runs } });
  } catch (error) {
    console.error('GET /api/challenges/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const ACTIONS = ['accept', 'decline', 'cancel', 'forfeit'] as const;
type Action = (typeof ACTIONS)[number];

// PATCH - { action }: accept / decline (challenged, while pending), cancel (challenger,
// while pending) or forfeit (either runner, during the race — the other one wins).
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const action = body?.action as Action;
    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Nieznana akcja.' }, { status: 400 });
    }

    await connectToDatabase();

    const { id } = await params;
    const found = await findOwnChallenge(id, user.id);
    if (!found) {
      return NextResponse.json({ error: 'Nie znaleziono wyzwania.' }, { status: 404 });
    }

    // Settle first: an invitation past its deadline can no longer be accepted, a decided race not forfeited.
    const challenge = await refreshChallenge(found);
    const isChallenger = challenge.challengerId === user.id;
    const link = challengeLink(String(challenge._id));
    const target = formatKm(challenge.targetKm);
    const now = new Date();

    const transition = async (from: IChallenge['status'], set: Record<string, unknown>) =>
      Challenge.findOneAndUpdate({ _id: challenge._id, status: from }, { $set: set }, { returnDocument: 'after' });

    let updated: IChallenge | null = null;

    switch (action) {
      case 'accept':
      case 'decline': {
        if (isChallenger) {
          return NextResponse.json({ error: 'Tylko wyzwana osoba może odpowiedzieć.' }, { status: 403 });
        }
        if (challenge.status !== 'pending') {
          return NextResponse.json({ error: 'To wyzwanie nie czeka już na odpowiedź.' }, { status: 409 });
        }
        updated = await transition(
          'pending',
          action === 'accept' ? { status: 'accepted', startDate: now } : { status: 'declined' }
        );
        if (updated) {
          await notifyUser(
            challenge.challengerId,
            action === 'accept' ? 'Wyzwanie przyjęte! 🏁' : 'Wyzwanie odrzucone',
            action === 'accept'
              ? `${challenge.challengedName} przyjmuje wyzwanie na ${target} km. Start — liczą się biegi od teraz!`
              : `${challenge.challengedName} odrzuca wyzwanie na ${target} km.`,
            link,
            { push: action === 'accept' }
          );
        }
        break;
      }

      case 'cancel': {
        if (!isChallenger) {
          return NextResponse.json({ error: 'Tylko autor może wycofać wyzwanie.' }, { status: 403 });
        }
        if (challenge.status !== 'pending') {
          return NextResponse.json({ error: 'Wycofać można tylko wyzwanie bez odpowiedzi.' }, { status: 409 });
        }
        updated = await transition('pending', { status: 'cancelled' });
        if (updated) {
          await notifyUser(
            challenge.challengedId,
            'Wyzwanie wycofane',
            `${challenge.challengerName} wycofuje wyzwanie na ${target} km.`,
            link
          );
        }
        break;
      }

      case 'forfeit': {
        if (challenge.status !== 'accepted') {
          return NextResponse.json({ error: 'Poddać można tylko trwające wyzwanie.' }, { status: 409 });
        }
        const winnerId = isChallenger ? challenge.challengedId : challenge.challengerId;
        updated = await transition('accepted', {
          status: 'completed',
          outcome: 'forfeit',
          winnerId,
          completedAt: now,
          rewardPoints: 0,
        });
        if (updated) await onChallengeSettled(updated, { forfeitedBy: user.id });
        break;
      }
    }

    if (!updated) {
      return NextResponse.json({ error: 'Wyzwanie zmieniło się w międzyczasie. Odśwież.' }, { status: 409 });
    }

    const [view] = await toChallengeViews([updated]);
    return NextResponse.json({ data: view });
  } catch (error) {
    console.error('PATCH /api/challenges/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
