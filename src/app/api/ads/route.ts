import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { getLiveAds } from '@/lib/ads-server';
import { jsonWithEtag } from '@/lib/http-cache';

/**
 * GET /api/ads
 *
 * Reklamy, które aplikacja sportowca może teraz pokazać temu użytkownikowi:
 * tylko włączone, w swoim oknie dat, poniżej limitów i dopasowane do odbiorcy.
 * Każda niesie listę ekranów (`placements`), na których wolno ją wyświetlić —
 * wybór i rotację robi aplikacja.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return jsonWithEtag(request, { ads: await getLiveAds(user) });
  } catch (error) {
    console.error('GET /api/ads error:', error);
    return NextResponse.json({ error: 'Nie udało się pobrać reklam.' }, { status: 500 });
  }
}
