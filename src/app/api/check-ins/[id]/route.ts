import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { WeeklyCheckIn } from '@/models/WeeklyCheckIn';
import { User } from '@/models/User';
import { Notification } from '@/models/Notification';
import { BodyMeasurement } from '@/models/BodyMeasurement';

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

        // Populate measurement if exists
        let measurement = null;
        if ((checkIn as any).measurementId) {
            measurement = await BodyMeasurement.findById((checkIn as any).measurementId).lean();
        }

        return NextResponse.json({
            checkIn: {
                ...(checkIn as any),
                id: (checkIn as any)._id.toString(),
                athleteName: (athlete as any)?.name || 'Nieznany',
                measurements: measurement ? {
                    weight: measurement.weight,
                    circumferences: measurement.circumferences,
                    photoURLs: measurement.photoURLs,
                } : undefined,
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
            // Athlete submitting or editing responses
            const { responses, measurements } = body;

            if (!responses) {
                return NextResponse.json({ error: 'Responses required' }, { status: 400 });
            }

            // Block editing if trainer has reviewed
            if (checkIn.status === 'reviewed') {
                return NextResponse.json(
                    { error: 'Cannot edit reviewed check-in' },
                    { status: 400 }
                );
            }

            checkIn.responses = {
                trainingRating: responses.trainingRating,
                physicalFeeling: responses.physicalFeeling,
                dietRating: responses.dietRating,
                hadIssues: responses.hadIssues || false,
                issuesDescription: responses.issuesDescription,
                additionalNotes: responses.additionalNotes,
            };

            // Handle measurements (create new or update existing)
            if (measurements && measurements.weight) {
                if (checkIn.measurementId) {
                    // Update existing measurement
                    await BodyMeasurement.findByIdAndUpdate(checkIn.measurementId, {
                        weight: measurements.weight,
                        circumferences: {
                            biceps: measurements.circumferences?.biceps || 0,
                            chest: measurements.circumferences?.chest || 0,
                            waist: measurements.circumferences?.waist || 0,
                            hips: measurements.circumferences?.hips || 0,
                            thigh: measurements.circumferences?.thigh || 0,
                        },
                        photoURLs: measurements.photoURLs || [],
                        date: new Date(), // Update date to reflect latest edit
                    });
                } else {
                    // Create new measurement
                    const bodyMeasurement = await BodyMeasurement.create({
                        ownerId: session.user.id,
                        date: new Date(),
                        weight: measurements.weight,
                        circumferences: {
                            biceps: measurements.circumferences?.biceps || 0,
                            chest: measurements.circumferences?.chest || 0,
                            waist: measurements.circumferences?.waist || 0,
                            hips: measurements.circumferences?.hips || 0,
                            thigh: measurements.circumferences?.thigh || 0,
                        },
                        photoURLs: measurements.photoURLs || [],
                        sharedWithTrainer: true,
                    });

                    checkIn.measurementId = bodyMeasurement._id.toString();
                }
            } else if (checkIn.measurementId && (!measurements || !measurements.weight)) {
                // User removed measurements - delete the reference but keep the measurement document
                checkIn.measurementId = undefined;
            }

            checkIn.status = 'submitted';
            checkIn.submittedAt = new Date();

            await checkIn.save();

            // Notify trainer only if this is a new submission
            if (!checkIn.submittedAt || checkIn.status === 'pending') {
                const athlete = await User.findById(checkIn.athleteId).lean();
                await Notification.create({
                    userId: checkIn.trainerId,
                    type: 'success',
                    title: 'Check-in wypełniony',
                    message: `${(athlete as any)?.name || 'Sportowiec'} wypełnił tygodniowy check-in.`,
                    link: '/trainer/command-center',
                    isRead: false,
                });
            }

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

// DELETE - Delete check-in (athlete only, before trainer review)
export async function DELETE(
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
        const checkIn = await WeeklyCheckIn.findById(id);

        if (!checkIn) {
            return NextResponse.json({ error: 'Check-in not found' }, { status: 404 });
        }

        // Only athlete can delete their own check-in
        if (checkIn.athleteId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Cannot delete if trainer has reviewed
        if (checkIn.status === 'reviewed') {
            return NextResponse.json(
                { error: 'Cannot delete reviewed check-in' },
                { status: 400 }
            );
        }

        // Note: We do NOT delete the associated measurement from bodyMeasurements
        // Measurements are independent data and should persist
        await WeeklyCheckIn.findByIdAndDelete(id);

        return NextResponse.json({
            message: 'Check-in deleted successfully',
        });
    } catch (error) {
        console.error('Check-in DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
