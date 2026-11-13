import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestUser } from '@/lib/api-auth';
import { PET_SLOTS } from '@/lib/pet/catalog';
import {
  equipPetItem,
  feedPet,
  openPetChest,
  PetError,
  playWithPet,
  renamePet,
  setPetRoom,
  strokePet,
  switchActivePet,
} from '@/lib/pet/service';

const key = z.string().min(1).max(64);

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('feed'), itemKey: key }),
  z.object({ action: z.literal('play'), itemKey: key }),
  z.object({ action: z.literal('pet') }),
  z.object({ action: z.literal('equip'), slot: z.enum(PET_SLOTS), itemKey: key.nullable() }),
  z.object({
    action: z.literal('room'),
    background: key.optional(),
    furniture: z.array(key).max(12).optional(),
  }),
  z.object({ action: z.literal('openChest'), chestId: key }),
  z.object({ action: z.literal('rename'), name: z.string().trim().min(1).max(20) }),
  z.object({ action: z.literal('switch'), petId: key }),
]);

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Nieprawidłowa akcja', issues: parsed.error.issues }, { status: 400 });
    }
    const input = parsed.data;

    switch (input.action) {
      case 'feed':
        return NextResponse.json(await feedPet(user.id, input.itemKey));
      case 'play':
        return NextResponse.json(await playWithPet(user.id, input.itemKey));
      case 'pet':
        return NextResponse.json(await strokePet(user.id));
      case 'equip':
        return NextResponse.json(await equipPetItem(user.id, input.slot, input.itemKey));
      case 'room':
        return NextResponse.json(await setPetRoom(user.id, { background: input.background, furniture: input.furniture }));
      case 'openChest':
        return NextResponse.json(await openPetChest(user.id, input.chestId));
      case 'rename':
        return NextResponse.json(await renamePet(user.id, input.name));
      case 'switch':
        return NextResponse.json(await switchActivePet(user.id, input.petId));
    }
  } catch (error) {
    if (error instanceof PetError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('POST /api/pet/actions error:', error);
    return NextResponse.json({ error: 'Coś poszło nie tak' }, { status: 500 });
  }
}
