import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/strava/callback`;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state'); // User ID
        const error = searchParams.get('error');

        if (error) {
            return NextResponse.redirect(
                `${process.env.NEXTAUTH_URL}/athlete/profile?strava_error=${error}`
            );
        }

        if (!code || !state) {
            return NextResponse.redirect(
                `${process.env.NEXTAUTH_URL}/athlete/profile?strava_error=missing_params`
            );
        }

        if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
            return NextResponse.redirect(
                `${process.env.NEXTAUTH_URL}/athlete/profile?strava_error=config_error`
            );
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
            return NextResponse.redirect(
                `${process.env.NEXTAUTH_URL}/athlete/profile?strava_error=token_exchange_failed`
            );
        }

        const tokenData = await tokenResponse.json();

        // Connect to database and update user
        await connectToDatabase();

        const expiresAt = new Date(tokenData.expires_at * 1000);

        await User.findByIdAndUpdate(state, {
            stravaAccessToken: tokenData.access_token,
            stravaRefreshToken: tokenData.refresh_token,
            stravaTokenExpiresAt: expiresAt,
            stravaAthleteId: tokenData.athlete?.id?.toString(),
        });

        // Redirect back to profile with success
        return NextResponse.redirect(
            `${process.env.NEXTAUTH_URL}/athlete/profile?strava_connected=true`
        );
    } catch (error) {
        console.error('Error in Strava callback:', error);
        return NextResponse.redirect(
            `${process.env.NEXTAUTH_URL}/athlete/profile?strava_error=server_error`
        );
    }
}
