import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { WorkoutLog, User } from '@/models';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50));
        const skip = Math.max(0, parseInt(searchParams.get('skip') || '0') || 0);

        // `athleteId` to zwykły tekst bez `ref`, więc sportowców dociągamy osobnym zapytaniem.
        const workoutLogs = await WorkoutLog.find()
            .sort({ startTime: -1 })
            .skip(skip)
            .limit(limit)
            // Lista pokazuje tylko nagłówek treningu; serie ćwiczeń i podsumowania są ciężkie.
            .select('athleteId workoutName startTime endTime duration status')
            .lean();

        // Tylko poprawne ObjectId — jeden nietypowy `athleteId` wywracał całe zapytanie o użytkowników.
        const athleteIds = Array.from(new Set(workoutLogs.map(log => log.athleteId)))
            .filter(id => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id));

        const athletes = await User.find({ _id: { $in: athleteIds } })
            .select('name email avatarUrl')
            .lean();

        const athleteMap = new Map(athletes.map(a => [a._id.toString(), a]));

        const populatedLogs = workoutLogs.map(log => ({
            ...log,
            athlete: athleteMap.get(log.athleteId) || null
        }));

        return NextResponse.json({ data: populatedLogs });

    } catch (error) {
        console.error('GET /api/admin/workout-logs error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
