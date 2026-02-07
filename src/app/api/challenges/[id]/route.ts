import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Challenge, RunningSession, StravaActivity } from '@/models';

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

// GET - Get challenge details with calculated progress
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const { id } = await params;

        const challenge = await Challenge.findById(id);

        if (!challenge) {
            return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
        }

        // Check if user is involved in this challenge
        if (challenge.challengerId !== session.user.id && challenge.challengedId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Calculate progress if challenge is accepted and not yet completed
        if (challenge.status === 'accepted' && challenge.startDate) {
            const now = new Date();
            const endDate = challenge.endDate < now ? challenge.endDate : now;

            const [challengerProgress, challengedProgress] = await Promise.all([
                calculateProgress(challenge.challengerId, challenge.startDate, endDate),
                calculateProgress(challenge.challengedId, challenge.startDate, endDate)
            ]);

            // Update cached progress
            challenge.challengerProgress = challengerProgress;
            challenge.challengedProgress = challengedProgress;

            // Check if challenge is completed (past end date)
            if (challenge.endDate < now) {
                challenge.status = 'completed';
                // Determine winner
                if (challengerProgress >= challenge.targetKm && challengedProgress >= challenge.targetKm) {
                    // Both completed - higher km wins
                    challenge.winnerId = challengerProgress > challengedProgress
                        ? challenge.challengerId
                        : challenge.challengedId;
                } else if (challengerProgress >= challenge.targetKm) {
                    challenge.winnerId = challenge.challengerId;
                } else if (challengedProgress >= challenge.targetKm) {
                    challenge.winnerId = challenge.challengedId;
                }
                // If neither completed target, no winner
            }

            await challenge.save();
        }

        return NextResponse.json({ data: challenge.toJSON() });
    } catch (error) {
        console.error('GET /api/challenges/[id] error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PATCH - Accept or decline challenge
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const { id } = await params;
        const body = await request.json();
        const { action } = body;

        if (!action || !['accept', 'decline', 'cancel'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Use: accept, decline, or cancel' },
                { status: 400 }
            );
        }

        const challenge = await Challenge.findById(id);

        if (!challenge) {
            return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
        }

        // Validate permissions based on action
        if (action === 'accept' || action === 'decline') {
            // Only the challenged user can accept or decline
            if (challenge.challengedId !== session.user.id) {
                return NextResponse.json(
                    { error: 'Only the challenged user can accept or decline' },
                    { status: 403 }
                );
            }

            if (challenge.status !== 'pending') {
                return NextResponse.json(
                    { error: 'Challenge is no longer pending' },
                    { status: 400 }
                );
            }
        }

        if (action === 'cancel') {
            // Only the challenger can cancel a pending challenge
            if (challenge.challengerId !== session.user.id) {
                return NextResponse.json(
                    { error: 'Only the challenger can cancel' },
                    { status: 403 }
                );
            }

            if (challenge.status !== 'pending') {
                return NextResponse.json(
                    { error: 'Can only cancel pending challenges' },
                    { status: 400 }
                );
            }
        }

        // Update status
        if (action === 'accept') {
            challenge.status = 'accepted';
            challenge.startDate = new Date(); // Challenge starts now
        } else if (action === 'decline') {
            challenge.status = 'declined';
        } else if (action === 'cancel') {
            challenge.status = 'cancelled';
        }

        await challenge.save();

        return NextResponse.json({ data: challenge.toJSON() });
    } catch (error) {
        console.error('PATCH /api/challenges/[id] error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
