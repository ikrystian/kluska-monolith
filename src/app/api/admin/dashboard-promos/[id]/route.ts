import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { promoInputSchema } from '@/lib/dashboard-promos';
import { denyUnlessAdmin } from '@/lib/dashboard-promos-server';
import { DashboardPromo } from '@/models/DashboardPromo';

type RouteContext = { params: Promise<{ id: string }> };

const CLEARABLE_FIELDS = ['text', 'imageUrl', 'ctaLabel', 'link', 'productId', 'articleId'] as const;

const notFound = () => NextResponse.json({ error: 'Nie znaleziono treści.' }, { status: 404 });

/**
 * PATCH /api/admin/dashboard-promos/:id
 *
 * Przyjmuje dowolny podzbiór pól (np. samo `active` z przełącznika na liście).
 * Podane pola są nakładane na zapisany dokument i walidowane jako całość, więc
 * częściowa zmiana nie może zostawić treści w niespójnym stanie.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const denied = await denyUnlessAdmin(request);
    if (denied) return denied;

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return notFound();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Nieprawidłowe dane.' }, { status: 400 });
    }

    await connectToDatabase();
    const promo = await DashboardPromo.findById(id);
    if (!promo) return notFound();

    const stored = promo.toObject();
    const parsed = promoInputSchema.safeParse({
      ...stored,
      startsAt: stored.startsAt ? new Date(stored.startsAt).toISOString() : null,
      endsAt: stored.endsAt ? new Date(stored.endsAt).toISOString() : null,
      ...body,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Nieprawidłowe dane.' }, { status: 400 });
    }

    promo.set(parsed.data);
    // An optional field the form emptied parses to nothing; unset it explicitly
    // rather than rely on the key surviving validation as `undefined`.
    for (const field of CLEARABLE_FIELDS) {
      if (parsed.data[field] === undefined) promo.set(field, undefined);
    }
    await promo.save();
    return NextResponse.json({ promo: promo.toJSON() });
  } catch (error) {
    console.error('PATCH /api/admin/dashboard-promos/[id] error:', error);
    return NextResponse.json({ error: 'Nie udało się zapisać treści.' }, { status: 500 });
  }
}

/** DELETE /api/admin/dashboard-promos/:id */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const denied = await denyUnlessAdmin(request);
    if (denied) return denied;

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return notFound();

    await connectToDatabase();
    const promo = await DashboardPromo.findByIdAndDelete(id);
    if (!promo) return notFound();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/admin/dashboard-promos/[id] error:', error);
    return NextResponse.json({ error: 'Nie udało się usunąć treści.' }, { status: 500 });
  }
}
