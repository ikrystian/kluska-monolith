import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import { Notification } from '@/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = parseInt(searchParams.get('skip') || '0');
        const unreadOnly = searchParams.get('unreadOnly') === 'true';

        const query: any = { userId: session.user.id };
        if (unreadOnly) {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ userId: session.user.id, isRead: false });

        return NextResponse.json({
            data: notifications,
            meta: {
                total,
                unreadCount,
                limit,
                skip
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        // Allow admins to create notifications for anyone, or users for themselves (unlikely but possible)
        // For now, let's say only system actions create notifications, but this endpoint is useful for testing
        // or if we have a client-side trigger (though usually backend triggers notifications).

        // Ideally, notifications are created by other backend services. 
        // If we want to allow an admin to send a notification via UI, we need to check admin role.

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const body = await req.json();

        // Basic validation
        if (!body.userId || !body.title || !body.message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Security check: Only admin can send to others, or user to themselves
        if (session.user.role !== 'admin' && body.userId !== session.user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const notification = await Notification.create({
            userId: body.userId,
            type: body.type || 'info',
            title: body.title,
            message: body.message,
            link: body.link,
            metadata: body.metadata,
        });

        return NextResponse.json({ data: notification }, { status: 201 });
    } catch (error) {
        console.error('Error creating notification:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
