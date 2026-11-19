import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { TrainerReview } from '@/models/TrainerReview';

const MAX_REVIEWS = 100;

/** Opinie trenera: lista, średnia i to, czy któraś jest od zalogowanego sportowca. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });

  await connectToDatabase();

  const [docs, [summary]] = await Promise.all([
    TrainerReview.find({ trainerId: id }).sort({ createdAt: -1 }).limit(MAX_REVIEWS).lean().exec(),
    TrainerReview.aggregate<{ average: number; count: number }>([
      { $match: { trainerId: id } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
  ]);

  return NextResponse.json({
    reviews: docs.map(doc => ({
      id: String(doc._id),
      rating: doc.rating,
      text: doc.text ?? '',
      athleteName: doc.athleteName,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      mine: doc.athleteId === user.id,
    })),
    average: summary ? Math.round(summary.average * 10) / 10 : null,
    count: summary?.count ?? 0,
  });
}

/** Dodaje albo zmienia opinię. Tylko podopieczny, który jest przypisany do tego trenera. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Wybierz ocenę od 1 do 5.' }, { status: 400 });
  }
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (text.length > 600) {
    return NextResponse.json({ error: 'Opinia może mieć najwyżej 600 znaków.' }, { status: 400 });
  }

  await connectToDatabase();

  if (user.role !== 'athlete') {
    return NextResponse.json({ error: 'Opinie wystawiają podopieczni trenera.' }, { status: 403 });
  }
  const me = await User.findById(user.id).select('trainerId').lean().exec();
  if (!me || me.trainerId !== id) {
    return NextResponse.json({ error: 'Opinię można dodać tylko u swojego trenera.' }, { status: 403 });
  }
  const trainer = await User.findOne({ _id: id, role: 'trainer' }).select('_id').lean().exec();
  if (!trainer) return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });

  const review = await TrainerReview.findOneAndUpdate(
    { trainerId: id, athleteId: user.id },
    { $set: { rating, text, athleteName: user.name } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec();

  return NextResponse.json({
    id: review?.id,
    rating,
    text,
    athleteName: user.name,
    createdAt: review?.createdAt,
    updatedAt: review?.updatedAt,
    mine: true,
  });
}
