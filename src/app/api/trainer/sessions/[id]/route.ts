import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { TrainingSession, User } from '@/models';

// GET - Pobierz szczegóły sesji
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUser = await getRequestUser(request);

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const { id } = await params;

        const trainingSession = await TrainingSession.findById(id);

        if (!trainingSession) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Sprawdź uprawnienia - tylko trener lub sportowiec z tej sesji
        if (trainingSession.trainerId !== authUser.id && trainingSession.athleteId !== authUser.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json({ data: trainingSession.toJSON() });
    } catch (error) {
        console.error('GET /api/trainer/sessions/[id] error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// PATCH - Aktualizuj sesję
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUser = await getRequestUser(request);

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const { id } = await params;

        const trainingSession = await TrainingSession.findById(id);

        if (!trainingSession) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        const user = await User.findById(authUser.id);
        const body = await request.json();

        // Trener może edytować wszystko, sportowiec tylko status (potwierdzenie)
        if (trainingSession.trainerId === authUser.id) {
            // Trener - pełna edycja
            const allowedFields = ['title', 'description', 'date', 'duration', 'location', 'status', 'notes', 'workoutId'];
            for (const field of allowedFields) {
                if (body[field] !== undefined) {
                    if (field === 'date') {
                        (trainingSession as any)[field] = new Date(body[field]);
                    } else {
                        (trainingSession as any)[field] = body[field];
                    }
                }
            }
        } else if (trainingSession.athleteId === authUser.id) {
            // Sportowiec - tylko zmiana statusu na confirmed
            if (body.status === 'confirmed' && trainingSession.status === 'scheduled') {
                trainingSession.status = 'confirmed';
            } else {
                return NextResponse.json({ error: 'Athletes can only confirm scheduled sessions' }, { status: 403 });
            }
        } else {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        await trainingSession.save();

        return NextResponse.json({ data: trainingSession.toJSON() });
    } catch (error) {
        console.error('PATCH /api/trainer/sessions/[id] error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// DELETE - Usuń sesję
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUser = await getRequestUser(request);

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const { id } = await params;

        const trainingSession = await TrainingSession.findById(id);

        if (!trainingSession) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Tylko trener może usunąć sesję
        if (trainingSession.trainerId !== authUser.id) {
            return NextResponse.json({ error: 'Only the trainer can delete this session' }, { status: 403 });
        }

        await TrainingSession.findByIdAndDelete(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/trainer/sessions/[id] error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
