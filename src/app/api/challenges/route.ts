import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Challenge, User, RunningSession, StravaActivity } from '@/models';

// Helper function to calculate running progress
async function calculateProgress(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const dateFilter = { $gte: startDate, $lte: endDate };

    // Get manual running sessions
    const runningSessions = await RunningSession.find({
        ownerId: userId,
        date: dateFilter
    });

    // Get Strava activities (running only)
    const stravaActivities = await StravaActivity.find({
        ownerId: userId,
        type: 'Run',
        date: dateFilter
    });

    // Calculate total km
    let totalKm = 0;

    // Add manual sessions (distance is in km)
    totalKm += runningSessions.reduce((sum, session) => sum + session.distance, 0);

    // Add Strava activities (distance is in meters, convert to km)
    totalKm += stravaActivities.reduce((sum, activity) => sum + (activity.distance / 1000), 0);

    return totalKm;
}

// GET - Fetch user's challenges (as challenger or challenged) with calculated progress
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const userId = session.user.id;

        // Get all challenges where user is involved
        const challenges = await Challenge.find({
            $or: [
                { challengerId: userId },
                { challengedId: userId }
            ]
        }).sort({ createdAt: -1 });

        // Calculate progress for each accepted challenge
        const now = new Date();
        const challengesWithProgress = await Promise.all(
            challenges.map(async (challenge) => {
                if (challenge.status === 'accepted' && challenge.startDate) {
                    const endDate = challenge.endDate < now ? challenge.endDate : now;

                    const [challengerProgress, challengedProgress] = await Promise.all([
                        calculateProgress(challenge.challengerId, challenge.startDate, endDate),
                        calculateProgress(challenge.challengedId, challenge.startDate, endDate)
                    ]);

                    // Update cached progress in database
                    challenge.challengerProgress = challengerProgress;
                    challenge.challengedProgress = challengedProgress;

                    // Check if someone reached the target or end date passed
                    const someoneReachedTarget = challengerProgress >= challenge.targetKm || challengedProgress >= challenge.targetKm;
                    const endDatePassed = challenge.endDate < now;

                    if ((someoneReachedTarget || endDatePassed) && challenge.status === 'accepted') {
                        challenge.status = 'completed';

                        // Determine winner - first to reach target wins, or higher km if end date passed
                        if (challengerProgress >= challenge.targetKm && challengedProgress >= challenge.targetKm) {
                            // Both reached target - first one wins (higher km at completion)
                            challenge.winnerId = challengerProgress > challengedProgress
                                ? challenge.challengerId
                                : challenge.challengedId;
                        } else if (challengerProgress >= challenge.targetKm) {
                            challenge.winnerId = challenge.challengerId;
                        } else if (challengedProgress >= challenge.targetKm) {
                            challenge.winnerId = challenge.challengedId;
                        }
                        // If neither reached target and time is up, no winner
                    }

                    await challenge.save();
                }
                return challenge.toJSON();
            })
        );

        return NextResponse.json({ data: challengesWithProgress });
    } catch (error) {
        console.error('GET /api/challenges error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST - Create new challenge
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const body = await request.json();
        const { challengedId, targetKm, endDate } = body;

        if (!challengedId || !targetKm || !endDate) {
            return NextResponse.json(
                { error: 'Missing required fields: challengedId, targetKm, endDate' },
                { status: 400 }
            );
        }

        // Cannot challenge yourself
        if (challengedId === session.user.id) {
            return NextResponse.json(
                { error: 'Cannot challenge yourself' },
                { status: 400 }
            );
        }

        // Get both user profiles
        const [challenger, challenged] = await Promise.all([
            User.findById(session.user.id),
            User.findById(challengedId)
        ]);

        if (!challenger) {
            return NextResponse.json({ error: 'Challenger not found' }, { status: 404 });
        }

        if (!challenged) {
            return NextResponse.json({ error: 'Challenged user not found' }, { status: 404 });
        }

        // Check for existing active challenge between these users
        const existingChallenge = await Challenge.findOne({
            $or: [
                { challengerId: session.user.id, challengedId, status: { $in: ['pending', 'accepted'] } },
                { challengerId: challengedId, challengedId: session.user.id, status: { $in: ['pending', 'accepted'] } }
            ]
        });

        if (existingChallenge) {
            return NextResponse.json(
                { error: 'An active challenge already exists between you and this user' },
                { status: 400 }
            );
        }

        // Create challenge
        const challenge = new Challenge({
            challengerId: session.user.id,
            challengedId,
            challengerName: challenger.name,
            challengedName: challenged.name,
            challengerAvatarUrl: challenger.avatarUrl,
            challengedAvatarUrl: challenged.avatarUrl,
            targetKm,
            endDate: new Date(endDate),
            status: 'pending',
            challengerProgress: 0,
            challengedProgress: 0,
        });

        await challenge.save();

        return NextResponse.json({ data: challenge.toJSON() }, { status: 201 });
    } catch (error) {
        console.error('POST /api/challenges error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
