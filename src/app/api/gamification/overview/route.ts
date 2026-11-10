import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { getOverview, listGoals, markAchievementsSeen } from '@/lib/gamification';

/** Jeden odczyt dla ekranu „Cele i nagrody”: profil, statystyki, ścieżki, wyzwania i cele. */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Najpierw przegląd (synchronizuje cele automatyczne), potem lista celów.
    const overview = await getOverview(user.id);
    const goals = await listGoals(user.id);

    return NextResponse.json({ ...overview, goals });
  } catch (error) {
    console.error('GET /api/gamification/overview error:', error);
    return NextResponse.json({ error: 'Nie udało się pobrać nagród' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    if (body?.action !== 'seen') return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    await markAchievementsSeen(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/gamification/overview error:', error);
    return NextResponse.json({ error: 'Nie udało się zapisać' }, { status: 500 });
  }
}
