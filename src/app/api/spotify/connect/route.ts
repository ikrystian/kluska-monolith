import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { createOAuthState, getOAuthRedirectUri, oauthConnectFailure } from '@/lib/oauth-connect';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    try {
        const user = await getRequestUser(request);

        if (!user) {
            return oauthConnectFailure('spotify', searchParams, 'unauthorized');
        }

        if (!SPOTIFY_CLIENT_ID) {
            return oauthConnectFailure('spotify', searchParams, 'config_error');
        }

        const state = createOAuthState(user.id, 'spotify', searchParams);

        const authUrl = new URL('https://accounts.spotify.com/authorize');
        authUrl.searchParams.append('client_id', SPOTIFY_CLIENT_ID);
        authUrl.searchParams.append('redirect_uri', getOAuthRedirectUri('spotify'));
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('scope', SCOPES);
        authUrl.searchParams.append('state', state);

        return NextResponse.redirect(authUrl.toString());
    } catch (error) {
        console.error('Error initiating Spotify OAuth:', error);
        return oauthConnectFailure('spotify', searchParams, 'server_error');
    }
}
