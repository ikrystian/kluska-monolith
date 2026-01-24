import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { WeeklyCheckIn } from '@/models/WeeklyCheckIn';
import { User } from '@/models/User';
import { Notification } from '@/models/Notification';

// GET - List check-ins
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '20');

        const user = await User.findById(session.user.id).lean();
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        let query: any = {};

        if ((user as any).role === 'trainer') {
            query.trainerId = session.user.id;
        } else if ((user as any).role === 'athlete') {
            query.athleteId = session.user.id;
        } else {
            return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
        }

        if (status) {
            query.status = status;
        }

        const checkIns = await WeeklyCheckIn.find(query)
            .sort({ weekStartDate: -1 })
            .limit(limit)
            .lean();

        // Enrich with athlete names for trainers
        let enrichedCheckIns = checkIns;
        if ((user as any).role === 'trainer') {
            const athleteIds = [...new Set(checkIns.map((c: any) => c.athleteId))];
            const athletes = await User.find({ _id: { $in: athleteIds } }).lean();
            const athleteMap = new Map(athletes.map((a: any) => [a._id.toString(), a]));

            enrichedCheckIns = checkIns.map((c: any) => {
                const athlete = athleteMap.get(c.athleteId);
                return {
                    ...c,
                    id: c._id.toString(),
                    athleteName: athlete?.name || 'Nieznany',
                };
            });
        } else {
            enrichedCheckIns = checkIns.map((c: any) => ({
                ...c,
                id: c._id.toString(),
            }));
        }

        return NextResponse.json({ checkIns: enrichedCheckIns });
    } catch (error) {
        console.error('Check-ins GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create check-in (trainer) or submit responses (athlete)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const body = await request.json();
        const user = await User.findById(session.user.id).lean();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if ((user as any).role === 'trainer') {
            // Trainer creating new check-in(s) for athlete(s)
            const { athleteIds, weekStartDate } = body;

            if (!athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
                return NextResponse.json({ error: 'athleteIds required' }, { status: 400 });
            }

            // Calculate Monday of the week if not provided
            let mondayDate = weekStartDate ? new Date(weekStartDate) : new Date();
            mondayDate.setDate(mondayDate.getDate() - mondayDate.getDay() + 1);
            mondayDate.setHours(0, 0, 0, 0);

            const createdCheckIns = [];
            const notifications = [];

            for (const athleteId of athleteIds) {
                // Check if check-in already exists for this week
                const existing = await WeeklyCheckIn.findOne({
                    athleteId,
                    trainerId: session.user.id,
                    weekStartDate: mondayDate,
                });

                if (!existing) {
                    const checkIn = await WeeklyCheckIn.create({
                        athleteId,
                        trainerId: session.user.id,
                        weekStartDate: mondayDate,
                        status: 'pending',
                    });
                    createdCheckIns.push(checkIn);

                    // Create notification for athlete
                    notifications.push({
                        userId: athleteId,
                        type: 'info',
                        title: 'Nowy Check-in',
                        message: 'Twój trener wysłał Ci tygodniowy check-in do wypełnienia.',
                        link: '/athlete/check-in',
                        isRead: false,
                    });
                }
            }

            // Create notifications
            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
            }

            return NextResponse.json({
                message: `Created ${createdCheckIns.length} check-in(s)`,
                checkIns: createdCheckIns.map((c: any) => ({ id: c._id.toString() })),
            });
        }

        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    } catch (error) {
        console.error('Check-ins POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
