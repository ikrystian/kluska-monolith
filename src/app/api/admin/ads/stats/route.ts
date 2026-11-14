import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { AdminApiError, adminErrorResponse, requireAdmin } from '@/lib/admin/guard';
import { getAdStats } from '@/lib/ads-server';

/**
 * GET /api/admin/ads/stats?days=30&adId=…
 *
 * Wyświetlenia i kliknięcia reklam z ostatnich dni: dzień po dniu, według
 * ekranu aplikacji i według reklamy. Bez `adId` — dla wszystkich reklam.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const search = new URL(request.url).searchParams;
    const adId = search.get('adId') ?? undefined;
    if (adId && !mongoose.isValidObjectId(adId)) throw new AdminApiError(400, 'Nieprawidłowy identyfikator reklamy.');

    return NextResponse.json(await getAdStats({ adId, days: Number(search.get('days') ?? 30) }));
  } catch (error) {
    return adminErrorResponse(error, 'GET /api/admin/ads/stats');
  }
}
