import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolveGymLogo } from '@/lib/gym-logo';

/**
 * POST /api/admin/gyms/logo  { website }
 *
 * Szuka logo na stronie siłowni i zapisuje je lokalnie (patrz `lib/gym-logo`).
 * Zwraca `{ logoUrl }` — `null`, gdy strona nie ma użytecznej ikony. Nie
 * dotyka bazy: zapisuje wynik wywołujący (formularz albo zbiorcze uzupełnianie).
 */
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const website = typeof body?.website === 'string' ? body.website.trim() : '';
    if (!website) {
        return NextResponse.json({ error: 'Website is required' }, { status: 400 });
    }

    return NextResponse.json({ logoUrl: await resolveGymLogo(website) });
}
