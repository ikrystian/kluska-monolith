import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/strava/callback`;

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!STRAVA_CLIENT_ID) {
            return NextResponse.json({ error: 'Strava client ID not configured' }, { status: 500 });
        }

        // Build authorization URL
        const authUrl = new URL('https://www.strava.com/oauth/authorize');
        authUrl.searchParams.append('client_id', STRAVA_CLIENT_ID);
        authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('scope', 'read,activity:read_all');
        authUrl.searchParams.append('state', session.user.id); // Use user ID as state for verification

        // Redirect to Strava authorization page
        return NextResponse.redirect(authUrl.toString());
    } catch (error) {
        console.error('Error initiating Strava OAuth:', error);
        return NextResponse.json(
            { error: 'Failed to initiate Strava connection' },
            { status: 500 }
        );
    }
}
