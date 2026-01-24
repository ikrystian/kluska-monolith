
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { AchievementBadge } from '@/models/AchievementBadge';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        await dbConnect();

        const achievement = await AchievementBadge.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!achievement) {
            return NextResponse.json(
                { error: 'Achievement not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(achievement);
    } catch (error) {
        console.error('Error updating achievement:', error);
        return NextResponse.json(
            { error: 'Failed to update achievement' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        await dbConnect();

        const achievement = await AchievementBadge.findByIdAndDelete(id);

        if (!achievement) {
            return NextResponse.json(
                { error: 'Achievement not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: 'Achievement deleted successfully' });
    } catch (error) {
        console.error('Error deleting achievement:', error);
        return NextResponse.json(
            { error: 'Failed to delete achievement' },
            { status: 500 }
        );
    }
}
