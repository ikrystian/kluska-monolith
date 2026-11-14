import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { recordAdEvents, type AdEvent } from '@/lib/ads-server';

/**
 * POST /api/ads/track
 *
 * Aplikacja zgłasza tu wyświetlenia i kliknięcia reklam, paczkami:
 * `{ events: [{ id, type: 'impression' | 'click', placement }] }`.
 * Podgląd w panelu administratora niczego nie zgłasza — liczy się tylko ruch
 * z aplikacji, a konta administratorów są pomijane.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const events: unknown = body?.events;
    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Brak listy zdarzeń.' }, { status: 400 });
    }

    // An admin checking the app would otherwise inflate the numbers they report on.
    const recorded = user.role === 'admin' ? 0 : await recordAdEvents(events as AdEvent[]);
    return NextResponse.json({ recorded });
  } catch (error) {
    console.error('POST /api/ads/track error:', error);
    return NextResponse.json({ error: 'Nie udało się zapisać zdarzeń.' }, { status: 500 });
  }
}
