import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings } from '@/lib/app-settings';
import { jsonWithEtag } from '@/lib/http-cache';

/**
 * GET /api/public/settings
 *
 * Globalne ustawienia aplikacji potrzebne klientowi jeszcze przed zalogowaniem
 * (np. czy pokazywać nakładkę Halloween na ekranie logowania), dlatego bez
 * autoryzacji. Zwraca wyłącznie wartości, które są bezpieczne do ujawnienia.
 */
export async function GET(request: NextRequest) {
  try {
    const { halloweenEnabled } = await getAppSettings();
    return jsonWithEtag(request, { halloweenEnabled });
  } catch (error) {
    console.error('GET /api/public/settings error:', error);
    return NextResponse.json({ error: 'Nie udało się pobrać ustawień.' }, { status: 500 });
  }
}
