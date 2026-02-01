
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { AchievementBadge } from '@/models/AchievementBadge';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const currentUser = await User.findById(session.user.id);
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = params;
        const body = await request.json();

        const updatedBadge = await AchievementBadge.findByIdAndUpdate(
            id,
            { $set: body },
            { new: true, runValidators: true }
        );

        if (!updatedBadge) {
            return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
        }

        return NextResponse.json(updatedBadge);
    } catch (error) {
        console.error('Error updating badge:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const currentUser = await User.findById(session.user.id);
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = params;

        const deletedBadge = await AchievementBadge.findByIdAndDelete(id);

        if (!deletedBadge) {
            return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Badge deleted successfully' });
    } catch (error) {
        console.error('Error deleting badge:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
