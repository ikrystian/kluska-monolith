import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { TrainingSession, User } from '@/models';

// GET - Pobierz sesje trenera
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const athleteId = searchParams.get('athleteId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const status = searchParams.get('status');

        // Budowanie query
        const query: any = {};

        // Trener widzi swoje sesje, sportowiec widzi sesje, w których uczestniczy
        const user = await User.findById(session.user.id);
        if (user?.role === 'trainer') {
            query.trainerId = session.user.id;
        } else {
            query.athleteId = session.user.id;
        }

        // Filtr po sportowcu (dla trenera)
        if (athleteId && user?.role === 'trainer') {
            query.athleteId = athleteId;
        }

        // Filtr po dacie
        if (startDate || endDate) {
            query.date = {};
            if (startDate) {
                query.date.$gte = new Date(startDate);
            }
            if (endDate) {
                query.date.$lte = new Date(endDate);
            }
        }

        // Filtr po statusie
        if (status) {
            query.status = status;
        }

        const sessions = await TrainingSession.find(query)
            .sort({ date: 1 })
            .exec();

        return NextResponse.json({ data: sessions });
    } catch (error) {
        console.error('GET /api/trainer/sessions error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// POST - Utwórz nową sesję
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Sprawdź czy użytkownik jest trenerem
        const user = await User.findById(session.user.id);
        if (user?.role !== 'trainer') {
            return NextResponse.json({ error: 'Only trainers can create sessions' }, { status: 403 });
        }

        const body = await request.json();
        const { athleteId, title, description, date, duration, location, notes, workoutId } = body;

        // Walidacja wymaganych pól
        if (!athleteId || !title || !date) {
            return NextResponse.json(
                { error: 'Missing required fields: athleteId, title, date' },
                { status: 400 }
            );
        }

        // Pobierz dane sportowca
        const athlete = await User.findById(athleteId);
        if (!athlete) {
            return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
        }

        // Sprawdź czy sportowiec jest przypisany do trenera
        if (athlete.trainerId !== session.user.id) {
            return NextResponse.json({ error: 'Athlete is not assigned to you' }, { status: 403 });
        }

        const trainingSession = new TrainingSession({
            trainerId: session.user.id,
            trainerName: user.name,
            athleteId: athleteId,
            athleteName: athlete.name,
            title,
            description: description || '',
            date: new Date(date),
            duration: duration || 60,
            location: location || '',
            status: 'scheduled',
            notes: notes || '',
            workoutId: workoutId || null,
        });

        await trainingSession.save();

        return NextResponse.json({ data: trainingSession.toJSON() }, { status: 201 });
    } catch (error) {
        console.error('POST /api/trainer/sessions error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
