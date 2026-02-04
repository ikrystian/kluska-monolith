import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { StravaActivity } from '@/models/StravaActivity';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

interface StravaTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_at: number;
}

interface StravaActivityData {
    id: number;
    name: string;
    type: string;
    start_date: string;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    total_elevation_gain?: number;
    average_speed?: number;
    max_speed?: number;
    average_heartrate?: number;
    max_heartrate?: number;
    average_cadence?: number;
    kudos_count?: number;
    map?: {
        summary_polyline?: string;
    };
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

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Get user with Strava credentials
        const user = await User.findById(session.user.id);

        if (!user?.stravaAccessToken || !user?.stravaRefreshToken) {
            return NextResponse.json(
                { error: 'Strava not connected. Please connect your Strava account first.' },
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
                    { error: 'Failed to refresh Strava token. Please reconnect your account.' },
                    { status: 401 }
                );
            }
        }

        // Fetch activities from Strava
        const activitiesResponse = await fetch(
            'https://www.strava.com/api/v3/athlete/activities?per_page=50',
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!activitiesResponse.ok) {
            console.error('Failed to fetch Strava activities:', await activitiesResponse.text());
            return NextResponse.json(
                { error: 'Failed to fetch activities from Strava' },
                { status: 500 }
            );
        }

        const activities: StravaActivityData[] = await activitiesResponse.json();

        // Filter for running activities only
        const runningActivities = activities.filter(
            (activity) => activity.type === 'Run' || activity.type === 'VirtualRun'
        );

        // Store activities in database
        let syncedCount = 0;
        for (const activity of runningActivities) {
            try {
                await StravaActivity.findOneAndUpdate(
                    { stravaActivityId: activity.id.toString() },
                    {
                        ownerId: session.user.id,
                        stravaActivityId: activity.id.toString(),
                        name: activity.name,
                        type: activity.type,
                        date: new Date(activity.start_date),
                        distance: activity.distance,
                        movingTime: activity.moving_time,
                        elapsedTime: activity.elapsed_time,
                        totalElevationGain: activity.total_elevation_gain,
                        averageSpeed: activity.average_speed,
                        maxSpeed: activity.max_speed,
                        averageHeartrate: activity.average_heartrate,
                        maxHeartrate: activity.max_heartrate,
                        averageCadence: activity.average_cadence,
                        kudosCount: activity.kudos_count,
                        map: activity.map
                            ? {
                                summaryPolyline: activity.map.summary_polyline,
                            }
                            : undefined,
                    },
                    { upsert: true, new: true }
                );
                syncedCount++;
            } catch (error) {
                console.error(`Failed to save activity ${activity.id}:`, error);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully synced ${syncedCount} running activities from Strava`,
            syncedCount,
        });
    } catch (error) {
        console.error('Error syncing Strava activities:', error);
        return NextResponse.json(
            { error: 'Failed to sync Strava activities', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
