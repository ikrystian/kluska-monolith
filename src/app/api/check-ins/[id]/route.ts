import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { WeeklyCheckIn } from '@/models/WeeklyCheckIn';
import { User } from '@/models/User';
import { Notification } from '@/models/Notification';

// GET - Get single check-in
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { id } = await params;
        const checkIn = await WeeklyCheckIn.findById(id).lean();

        if (!checkIn) {
            return NextResponse.json({ error: 'Check-in not found' }, { status: 404 });
        }

        // Verify access
        const userId = session.user.id;
        if ((checkIn as any).athleteId !== userId && (checkIn as any).trainerId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Enrich with athlete name
        const athlete = await User.findById((checkIn as any).athleteId).lean();

        return NextResponse.json({
            checkIn: {
                ...(checkIn as any),
                id: (checkIn as any)._id.toString(),
                athleteName: (athlete as any)?.name || 'Nieznany',
            },
        });
    } catch (error) {
        console.error('Check-in GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH - Update check-in (athlete submits responses or trainer adds notes)
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { id } = await params;
        const body = await request.json();
        const checkIn = await WeeklyCheckIn.findById(id);

        if (!checkIn) {
            return NextResponse.json({ error: 'Check-in not found' }, { status: 404 });
        }

        const user = await User.findById(session.user.id).lean();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const isAthlete = checkIn.athleteId === session.user.id;
        const isTrainer = checkIn.trainerId === session.user.id;

        if (!isAthlete && !isTrainer) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (isAthlete) {
            // Athlete submitting responses
            const { responses } = body;

            if (!responses) {
                return NextResponse.json({ error: 'Responses required' }, { status: 400 });
            }

            checkIn.responses = {
                trainingRating: responses.trainingRating,
                physicalFeeling: responses.physicalFeeling,
                dietRating: responses.dietRating,
                hadIssues: responses.hadIssues || false,
                issuesDescription: responses.issuesDescription,
                additionalNotes: responses.additionalNotes,
            };
            checkIn.status = 'submitted';
            checkIn.submittedAt = new Date();

            await checkIn.save();

            // Notify trainer
            const athlete = await User.findById(checkIn.athleteId).lean();
            await Notification.create({
                userId: checkIn.trainerId,
                type: 'success',
                title: 'Check-in wypełniony',
                message: `${(athlete as any)?.name || 'Sportowiec'} wypełnił tygodniowy check-in.`,
                link: '/trainer/command-center',
                isRead: false,
            });

            return NextResponse.json({
                message: 'Check-in submitted successfully',
                checkIn: { id: checkIn._id.toString(), status: checkIn.status },
            });
        }

        if (isTrainer) {
            // Trainer adding notes or marking as reviewed
            const { trainerNotes, markAsReviewed } = body;

            if (trainerNotes !== undefined) {
                checkIn.trainerNotes = trainerNotes;
            }

            if (markAsReviewed && checkIn.status === 'submitted') {
                checkIn.status = 'reviewed';
            }

            await checkIn.save();

            return NextResponse.json({
                message: 'Check-in updated successfully',
                checkIn: { id: checkIn._id.toString(), status: checkIn.status },
            });
        }

        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    } catch (error) {
        console.error('Check-in PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
