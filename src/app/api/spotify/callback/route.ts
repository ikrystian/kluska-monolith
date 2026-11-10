import { NextRequest } from 'next/server';
import { getOAuthRedirectUri, oauthResultRedirect, readOAuthState } from '@/lib/oauth-connect';
import { connectToDatabase } from '@/lib/mongodb';
import { SpotifyAccount } from '@/models/SpotifyAccount';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const rawState = searchParams.get('state');
    const error = searchParams.get('error');

    const state = readOAuthState(rawState, 'spotify');
    const userId = state?.sub;

    const handleRedirect = (failure?: string) => oauthResultRedirect(state, 'spotify', failure);

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

        if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
            return handleRedirect('config_error');
        }

        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: getOAuthRedirectUri('spotify'),
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Spotify token exchange failed:', errorData);
            return handleRedirect('token_exchange_failed');
        }

        const tokenData = await tokenResponse.json();

        const profileResponse = await fetch('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const profile = profileResponse.ok ? await profileResponse.json() : null;

        await connectToDatabase();

        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

        await SpotifyAccount.findOneAndUpdate(
            { userId },
            {
                userId,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                tokenExpiresAt: expiresAt,
                spotifyUserId: profile?.id,
            },
            { upsert: true, new: true }
        );

        return handleRedirect();
    } catch (error) {
        console.error('Error in Spotify callback:', error);
        return handleRedirect('server_error');
    }
}
