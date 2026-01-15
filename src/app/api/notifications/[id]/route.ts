import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Notification } from '@/models';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        await dbConnect();
        const body = await req.json();

        const notification = await Notification.findById(id);

        if (!notification) {
            return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
        }

        // Security check: Ensure user owns the notification
        if (notification.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Update fields
        if (typeof body.isRead === 'boolean') {
            notification.isRead = body.isRead;
        }

        await notification.save();

        return NextResponse.json({ data: notification });
    } catch (error) {
        console.error('Error updating notification:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
