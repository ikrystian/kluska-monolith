import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { getAppSettings, updateAppSettings, type AppSettingsData } from '@/lib/app-settings';

async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

/** GET /api/admin/settings — aktualne globalne ustawienia aplikacji. */
export async function GET(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;

    return NextResponse.json(await getAppSettings());
  } catch (error) {
    console.error('GET /api/admin/settings error:', error);
    return NextResponse.json({ error: 'Nie udało się pobrać ustawień.' }, { status: 500 });
  }
}

/** PATCH /api/admin/settings — zmienia podane ustawienia, pozostałe zostają bez zmian. */
export async function PATCH(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;

    const body = await request.json().catch(() => null);
    const patch: Partial<AppSettingsData> = {};

    if (body && 'halloweenEnabled' in body) {
      if (typeof body.halloweenEnabled !== 'boolean') {
        return NextResponse.json({ error: 'halloweenEnabled musi być wartością logiczną.' }, { status: 400 });
      }
      patch.halloweenEnabled = body.halloweenEnabled;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Brak ustawień do zapisania.' }, { status: 400 });
    }

    return NextResponse.json(await updateAppSettings(patch));
  } catch (error) {
    console.error('PATCH /api/admin/settings error:', error);
    return NextResponse.json({ error: 'Nie udało się zapisać ustawień.' }, { status: 500 });
  }
}
