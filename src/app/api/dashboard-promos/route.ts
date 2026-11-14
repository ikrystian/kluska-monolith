import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { getLivePromos } from '@/lib/dashboard-promos-server';
import { jsonWithEtag } from '@/lib/http-cache';

/**
 * GET /api/dashboard-promos
 *
 * Treści zdefiniowane przez administratora, które aplikacja sportowca pokazuje
 * nad paskiem tygodnia: tylko włączone, w swoim oknie dat i przeznaczone dla
 * tego użytkownika (gość / konto), w kolejności wyświetlania.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return jsonWithEtag(request, { promos: await getLivePromos(user) });
  } catch (error) {
    console.error('GET /api/dashboard-promos error:', error);
    return NextResponse.json({ error: 'Nie udało się pobrać treści.' }, { status: 500 });
  }
}
