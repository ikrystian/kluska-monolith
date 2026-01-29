import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { WeeklyCheckIn } from '@/models/WeeklyCheckIn';
import { User } from '@/models/User';
import { WorkoutLog } from '@/models/WorkoutLog';
import { PersonalRecord } from '@/models/PersonalRecord';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const trainerId = session.user.id;

        // Get all athletes for this trainer
        const athletes = await User.find({ trainerId, role: 'athlete' }).lean();
        const athleteIds = athletes.map((a: any) => a._id.toString());

        if (athleteIds.length === 0) {
            return NextResponse.json({
                athletes: [],
                missedWorkouts: [],
                recentRecords: [],
                checkInStats: { pending: 0, submitted: 0, total: 0 },
                summary: {
                    totalAthletes: 0,
                    activeThisWeek: 0,
                    pendingCheckIns: 0,
                    newRecords: 0,
                }
            });
        }

        // Calculate week boundaries
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(now.getDate() - 7);

        // Get workout logs from last 7 days for all athletes
        const recentWorkouts = await WorkoutLog.find({
            athleteId: { $in: athleteIds },
            endTime: { $gte: oneWeekAgo },
            status: 'completed'
        }).lean();

        // Find athletes who haven't trained in the last 7 days
        const athletesWithWorkouts = new Set(recentWorkouts.map((w: any) => w.athleteId));
        const missedWorkouts = athletes
            .filter((a: any) => !athletesWithWorkouts.has(a._id.toString()))
            .map((a: any) => ({
                id: a._id.toString(),
                name: a.name,
                email: a.email,
                avatarUrl: a.avatarUrl,
                daysSinceLastWorkout: null // Could calculate from last workout
            }));

        // Get recent personal records (last 7 days)
        const recentRecords = await PersonalRecord.find({
            athleteId: { $in: athleteIds },
            achievedAt: { $gte: oneWeekAgo }
        })
            .sort({ achievedAt: -1 })
            .limit(10)
            .lean();

        // Enrich records with athlete names
        const enrichedRecords = recentRecords.map((record: any) => {
            const athlete = athletes.find((a: any) => a._id.toString() === record.athleteId);
            return {
                ...record,
                id: record._id.toString(),
                athleteName: athlete?.name || 'Nieznany',
            };
        });

        // Get check-in stats for current week
        const checkIns = await WeeklyCheckIn.find({
            trainerId,
            weekStartDate: { $gte: startOfWeek, $lt: endOfWeek }
        }).lean();

        const pendingCheckIns = checkIns.filter((c: any) => c.status === 'pending').length;
        const submittedCheckIns = checkIns.filter((c: any) => c.status === 'submitted' || c.status === 'reviewed').length;

        // Get athletes with pending check-ins
        const pendingCheckInAthletes = checkIns
            .filter((c: any) => c.status === 'pending')
            .map((c: any) => {
                const athlete = athletes.find((a: any) => a._id.toString() === c.athleteId);
                return {
                    checkInId: c._id.toString(),
                    athleteId: c.athleteId,
                    athleteName: athlete?.name || 'Nieznany',
                    weekStartDate: c.weekStartDate,
                };
            });

        return NextResponse.json({
            athletes: athletes.map((a: any) => ({
                id: a._id.toString(),
                name: a.name,
                email: a.email,
                avatarUrl: a.avatarUrl,
                hasWorkedOutThisWeek: athletesWithWorkouts.has(a._id.toString()),
            })),
            missedWorkouts,
            recentRecords: enrichedRecords,
            pendingCheckInAthletes,
            checkInStats: {
                pending: pendingCheckIns,
                submitted: submittedCheckIns,
                total: checkIns.length,
            },
            summary: {
                totalAthletes: athletes.length,
                activeThisWeek: athletesWithWorkouts.size,
                pendingCheckIns,
                newRecords: recentRecords.length,
            }
        });
    } catch (error) {
        console.error('Command Center API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
