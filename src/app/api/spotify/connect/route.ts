import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/spotify/callback`;
const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing';

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!SPOTIFY_CLIENT_ID) {
            return NextResponse.json({ error: 'Spotify client ID not configured' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const platform = searchParams.get('platform');
        const state = platform ? `${user.id}:${platform}` : user.id;

        const authUrl = new URL('https://accounts.spotify.com/authorize');
        authUrl.searchParams.append('client_id', SPOTIFY_CLIENT_ID);
        authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('scope', SCOPES);
        authUrl.searchParams.append('state', state);

        return NextResponse.redirect(authUrl.toString());
    } catch (error) {
        console.error('Error initiating Spotify OAuth:', error);
        return NextResponse.json(
            { error: 'Failed to initiate Spotify connection' },
            { status: 500 }
        );
    }
}
