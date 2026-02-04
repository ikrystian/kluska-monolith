import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

interface StravaTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_at: number;
}

async function refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
    const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to refresh Strava token');
    }

    return await response.json();
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ activityId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const { activityId } = await params;

        // Get user with Strava credentials
        const user = await User.findById(session.user.id);

        if (!user?.stravaAccessToken || !user?.stravaRefreshToken) {
            return NextResponse.json(
                { error: 'Strava not connected' },
                { status: 400 }
            );
        }

        let accessToken = user.stravaAccessToken;

        // Check if token is expired and refresh if needed
        if (user.stravaTokenExpiresAt && new Date() >= user.stravaTokenExpiresAt) {
            try {
                const tokenData = await refreshAccessToken(user.stravaRefreshToken);
                accessToken = tokenData.access_token;

                // Update user with new tokens
                await User.findByIdAndUpdate(session.user.id, {
                    stravaAccessToken: tokenData.access_token,
                    stravaRefreshToken: tokenData.refresh_token,
                    stravaTokenExpiresAt: new Date(tokenData.expires_at * 1000),
                });
            } catch (error) {
                console.error('Failed to refresh Strava token:', error);
                return NextResponse.json(
                    { error: 'Failed to refresh Strava token' },
                    { status: 401 }
                );
            }
        }

        // Fetch detailed activity from Strava
        const activityResponse = await fetch(
            `https://www.strava.com/api/v3/activities/${activityId}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!activityResponse.ok) {
            console.error('Failed to fetch Strava activity:', await activityResponse.text());
            return NextResponse.json(
                { error: 'Failed to fetch activity from Strava' },
                { status: 500 }
            );
        }

        const activityData = await activityResponse.json();

        return NextResponse.json({ data: activityData });
    } catch (error) {
        console.error('Error fetching Strava activity details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch activity details', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
