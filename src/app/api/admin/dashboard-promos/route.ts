import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { promoInputSchema } from '@/lib/dashboard-promos';
import { denyUnlessAdmin } from '@/lib/dashboard-promos-server';
import { DashboardPromo } from '@/models/DashboardPromo';

/** GET /api/admin/dashboard-promos — wszystkie treści, także wyłączone i zakończone. */
export async function GET(request: NextRequest) {
  try {
    const denied = await denyUnlessAdmin(request);
    if (denied) return denied;

    await connectToDatabase();
    const promos = await DashboardPromo.find().sort({ order: 1, createdAt: -1 });
    return NextResponse.json({ promos: promos.map((promo) => promo.toJSON()) });
  } catch (error) {
    console.error('GET /api/admin/dashboard-promos error:', error);
    return NextResponse.json({ error: 'Nie udało się pobrać treści.' }, { status: 500 });
  }
}

/** POST /api/admin/dashboard-promos — dodaje nową treść. */
export async function POST(request: NextRequest) {
  try {
    const denied = await denyUnlessAdmin(request);
    if (denied) return denied;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Nieprawidłowe dane.' }, { status: 400 });
    }

    const parsed = promoInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Nieprawidłowe dane.' }, { status: 400 });
    }

    await connectToDatabase();
    const promo = await DashboardPromo.create(parsed.data);
    return NextResponse.json({ promo: promo.toJSON() }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/dashboard-promos error:', error);
    return NextResponse.json({ error: 'Nie udało się zapisać treści.' }, { status: 500 });
  }
}
