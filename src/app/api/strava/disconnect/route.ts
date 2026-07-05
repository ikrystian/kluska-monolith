import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Remove Strava credentials from user
        await User.findByIdAndUpdate(user.id, {
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
