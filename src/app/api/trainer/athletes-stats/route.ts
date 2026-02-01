import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { WorkoutLog } from '@/models/WorkoutLog';
import { WeeklyCheckIn } from '@/models/WeeklyCheckIn';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { User } from '@/models/User';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Get trainerId from query params (if trainer wants stats for specific athletes)
        const { searchParams } = new URL(req.url);
        let requestedAthleteIds = searchParams.get('athleteIds')?.split(',') || [];

        // Fetch all athletes assigned to this trainer to validate access
        const assignedAthletes = await User.find({ trainerId: session.user.id }).select('_id');
        const assignedAthleteIds = assignedAthletes.map(a => a._id.toString());

        // If no specific athletes requested, use all assigned athletes
        // If specific athletes requested, filter to only include those assigned to this trainer
        let targetAthleteIds: string[] = [];

        if (requestedAthleteIds.length > 0) {
            targetAthleteIds = requestedAthleteIds.filter(id => assignedAthleteIds.includes(id));
        } else {
            // If no IDs provided, decide if we want to return all assigned or none.
            // The original code returned empty stats if no IDs were provided.
            // Let's keep that behavior for consistency, or we could default to all assigned.
            // Original: if (athleteIds.length === 0) { return NextResponse.json({ stats: {} }, { status: 200 }); }
            targetAthleteIds = []; // Match original behavior of not returning anything if nothing requested
        }

        if (targetAthleteIds.length === 0) {
            // If we filtered out everything or nothing was requested, return empty
            return NextResponse.json({ stats: {} }, { status: 200 });
        }

        // Aggregate workout stats for each athlete
        const workoutStats = await WorkoutLog.aggregate([
            {
                $match: {
                    athleteId: { $in: targetAthleteIds }
                }
            },
            {
                $group: {
                    _id: '$athleteId',
                    totalWorkouts: { $sum: 1 },
                    lastWorkoutDate: { $max: '$createdAt' }
                }
            }
        ]);

        // Aggregate check-in stats for each athlete
        const checkInStats = await WeeklyCheckIn.aggregate([
            {
                $match: {
                    userId: { $in: targetAthleteIds }
                }
            },
            {
                $group: {
                    _id: '$userId',
                    lastCheckInDate: { $max: '$createdAt' }
                }
            }
        ]);

        // Combine stats into a single object
        const stats: Record<string, any> = {};

        workoutStats.forEach((stat) => {
            stats[stat._id] = {
                totalWorkouts: stat.totalWorkouts,
                lastWorkoutDate: stat.lastWorkoutDate,
                lastCheckInDate: null
            };
        });

        checkInStats.forEach((stat) => {
            if (stats[stat._id]) {
                stats[stat._id].lastCheckInDate = stat.lastCheckInDate;
            } else {
                stats[stat._id] = {
                    totalWorkouts: 0,
                    lastWorkoutDate: null,
                    lastCheckInDate: stat.lastCheckInDate
                };
            }
        });

        // Initialize stats for athletes with no data
        targetAthleteIds.forEach((id) => {
            if (!stats[id]) {
                stats[id] = {
                    totalWorkouts: 0,
                    lastWorkoutDate: null,
                    lastCheckInDate: null
                };
            }
        });

        return NextResponse.json({ stats }, { status: 200 });
    } catch (error) {
        console.error('Error fetching athlete stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch athlete stats' },
            { status: 500 }
        );
    }
}
