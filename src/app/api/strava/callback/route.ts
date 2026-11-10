import { NextRequest } from 'next/server';
import { getOAuthRedirectUri, oauthResultRedirect, readOAuthState } from '@/lib/oauth-connect';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const rawState = searchParams.get('state');
    const error = searchParams.get('error');

    const state = readOAuthState(rawState, 'strava');
    const userId = state?.sub;

    const handleRedirect = (failure?: string) => oauthResultRedirect(state, 'strava', failure);

    try {
        if (error) {
            return handleRedirect(error);
        }

        if (!state) {
            return handleRedirect('invalid_state');
        }

        if (!code || !userId) {
            return handleRedirect('missing_params');
        }

        if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
            return handleRedirect('config_error');
        }

        // Exchange authorization code for tokens
        const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: STRAVA_CLIENT_ID,
                client_secret: STRAVA_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('Strava token exchange failed:', errorData);
            return handleRedirect('token_exchange_failed');
        }

        const tokenData = await tokenResponse.json();

        // Connect to database and update user
        await connectToDatabase();

        const expiresAt = new Date(tokenData.expires_at * 1000);

        await User.findByIdAndUpdate(userId, {
            stravaAccessToken: tokenData.access_token,
            stravaRefreshToken: tokenData.refresh_token,
            stravaTokenExpiresAt: expiresAt,
            stravaAthleteId: tokenData.athlete?.id?.toString(),
        });

        // Redirect back to profile with success
        return handleRedirect();
    } catch (error) {
        console.error('Error in Strava callback:', error);
        return handleRedirect('server_error');
    }
}
