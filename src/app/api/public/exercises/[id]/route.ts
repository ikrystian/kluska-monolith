import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getExerciseStats, getPublicExercise } from '@/lib/exercise-public';

// GET - Publiczne dane ćwiczenia (bez logowania) wraz z tonażem
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const exercise = await getPublicExercise(id);
    if (!exercise) {
      return NextResponse.json({ error: 'Nie znaleziono ćwiczenia' }, { status: 404 });
    }

    const stats = await getExerciseStats(exercise.id);

    return NextResponse.json(
      { data: { exercise, stats } },
      { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } }
    );
  } catch (error) {
    console.error('GET /api/public/exercises/[id] error:', error);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
