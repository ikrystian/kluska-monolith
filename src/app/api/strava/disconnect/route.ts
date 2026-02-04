import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Remove Strava credentials from user
        await User.findByIdAndUpdate(session.user.id, {
            $unset: {
                stravaAccessToken: '',
                stravaRefreshToken: '',
                stravaTokenExpiresAt: '',
                stravaAthleteId: '',
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Successfully disconnected Strava account',
        });
    } catch (error) {
        console.error('Error disconnecting Strava:', error);
        return NextResponse.json(
            { error: 'Failed to disconnect Strava account' },
            { status: 500 }
        );
    }
}
