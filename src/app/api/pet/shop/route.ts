import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestUser } from '@/lib/api-auth';
import { buyPetItem, getPetState, PetError } from '@/lib/pet/service';

const buySchema = z.object({
  itemKey: z.string().min(1).max(64),
  qty: z.number().int().min(1).max(20).default(1),
});

/** Katalog sklepu z saldem i tym, co użytkownik już ma. */
export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const state = await getPetState(user.id);
    return NextResponse.json({
      balance: state.balance,
      items: state.catalog,
      ownedItems: state.ownedItems,
      inventory: state.inventory,
    });
  } catch (error) {
    console.error('GET /api/pet/shop error:', error);
    return NextResponse.json({ error: 'Nie udało się pobrać sklepu' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = buySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Nieprawidłowy zakup', issues: parsed.error.issues }, { status: 400 });
    }

    return NextResponse.json(await buyPetItem(user.id, parsed.data.itemKey, parsed.data.qty));
  } catch (error) {
    if (error instanceof PetError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('POST /api/pet/shop error:', error);
    return NextResponse.json({ error: 'Nie udało się kupić przedmiotu' }, { status: 500 });
  }
}
