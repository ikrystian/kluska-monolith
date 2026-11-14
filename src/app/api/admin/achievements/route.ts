
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import dbConnect from '@/lib/db';
import { AchievementBadge } from '@/models/AchievementBadge';

/** Odznaki zmienia tylko administrator; `null` oznacza, że wolno. */
async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
    const user = await getRequestUser(request);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return null;
}

export async function GET(request: NextRequest) {
    try {
        const denied = await requireAdmin(request);
        if (denied) return denied;

        await dbConnect();
        const achievements = await AchievementBadge.find({}).sort({ createdAt: -1 });

        return NextResponse.json(achievements);
    } catch (error) {
        console.error('Error fetching achievements:', error);
        return NextResponse.json(
            { error: 'Failed to fetch achievements' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const denied = await requireAdmin(request);
        if (denied) return denied;

        const body = await request.json();
        await dbConnect();

        const achievement = await AchievementBadge.create(body);

        return NextResponse.json(achievement, { status: 201 });
    } catch (error) {
        console.error('Error creating achievement:', error);
        return NextResponse.json(
            { error: 'Failed to create achievement' },
            { status: 500 }
        );
    }
}
