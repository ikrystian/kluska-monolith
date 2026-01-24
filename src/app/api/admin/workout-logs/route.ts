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

        // Ensure User model is registered for population
        // (Defining it here or importing it ensures mongoose knows about it)
        const _ = User;

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = parseInt(searchParams.get('skip') || '0');

        const logs = await WorkoutLog.find()
            .sort({ startTime: -1 })
            .skip(skip)
            .limit(limit)
            .populate('athleteId', 'name email avatarUrl')
            .lean();

        // Transform logs to replace athleteId string/object with actual athlete object if population worked
        // Mongoose populate replaces the field. But in the model definition, athleteId is a string.
        // We typically want to type this properly, but for JSON response it's fine.
        // However, since athleteId in the schema is defined as String, population uses ref in virtuals or we need to check if schema uses ref.

        // Let's check WorkoutLog schema again.
        // The model definition I read earlier: athleteId: { type: String, required: true }
        // It DOES NOT have specific 'ref' property in the schema definition shown in the `view_file` output earlier.
        // 
        // Wait, let me re-verify the WorkoutLog model content from step 14.
        // Line 74: athleteId: { type: String, required: true },
        // It is just a String. It does NOT have `ref: 'User'`.
        // Mongoose `populate` ONLY works if there is a `ref` or if we use virtual populate.

        // I need to check `User` model too.

        // Since I cannot rely on populate if `ref` is missing, I might need to do a manual lookup or use aggregation.
        // Or I can use virtual populate if it's set up. The model file didn't show virtuals for 'athlete'.

        // Strategy:
        // 1. Fetch logs.
        // 2. Extract unique athleteIds.
        // 3. Fetch users with those IDs.
        // 4. Map users to logs.

        // Let's implement this manual mapping to be safe and robust.

        const workoutLogs = await WorkoutLog.find()
            .sort({ startTime: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const athleteIds = Array.from(new Set(workoutLogs.map(log => log.athleteId).filter(Boolean)));

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
