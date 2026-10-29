import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Exercise } from '@/models';

/**
 * DELETE /api/admin/exercises
 *
 * Usuwa wszystkie ćwiczenia jednym zapytaniem. Lista ćwiczeń w panelu jest
 * stronicowana, więc klient nie zna wszystkich id — usuwanie po stronie
 * serwera zastępuje wysyłanie osobnego DELETE dla każdego ćwiczenia.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectToDatabase();
    const { deletedCount } = await Exercise.deleteMany({});

    return NextResponse.json({ deleted: deletedCount });
  } catch (error) {
    console.error('DELETE /api/admin/exercises error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nie udało się usunąć ćwiczeń.' },
      { status: 500 }
    );
  }
}
