import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { createOAuthState, getOAuthRedirectUri, oauthConnectFailure } from '@/lib/oauth-connect';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    try {
        const user = await getRequestUser(request);

        if (!user) {
            return oauthConnectFailure('strava', searchParams, 'unauthorized');
        }

        if (!STRAVA_CLIENT_ID) {
            return oauthConnectFailure('strava', searchParams, 'config_error');
        }

        const state = createOAuthState(user.id, 'strava', searchParams);

        // Build authorization URL
        const authUrl = new URL('https://www.strava.com/oauth/authorize');
        authUrl.searchParams.append('client_id', STRAVA_CLIENT_ID);
        authUrl.searchParams.append('redirect_uri', getOAuthRedirectUri('strava'));
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('scope', 'read,activity:read_all');
        authUrl.searchParams.append('state', state);

        // Redirect to Strava authorization page
        return NextResponse.redirect(authUrl.toString());
    } catch (error) {
        console.error('Error initiating Strava OAuth:', error);
        return oauthConnectFailure('strava', searchParams, 'server_error');
    }
}
