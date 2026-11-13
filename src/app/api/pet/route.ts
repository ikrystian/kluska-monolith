import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestUser } from '@/lib/api-auth';
import { PET_SPECIES } from '@/lib/pet/catalog';
import { adoptPet, getPetState, PetError } from '@/lib/pet/service';

const adoptSchema = z.object({
  species: z.enum(PET_SPECIES),
  name: z.string().trim().min(1).max(20),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return NextResponse.json(await getPetState(user.id));
  } catch (error) {
    console.error('GET /api/pet error:', error);
    return NextResponse.json({ error: 'Nie udało się pobrać zwierzaka' }, { status: 500 });
  }
}

/** Adopcja: pierwszy zwierzak albo kolejny, gdy obecny jest Mistrzem. */
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parsed = adoptSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Wybierz gatunek i imię (do 20 znaków)', issues: parsed.error.issues }, { status: 400 });
    }

    return NextResponse.json(await adoptPet(user.id, parsed.data.species, parsed.data.name), { status: 201 });
  } catch (error) {
    if (error instanceof PetError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('POST /api/pet error:', error);
    return NextResponse.json({ error: 'Nie udało się adoptować zwierzaka' }, { status: 500 });
  }
}
