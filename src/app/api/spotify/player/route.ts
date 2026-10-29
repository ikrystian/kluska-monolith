import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { getValidSpotifyAccessToken } from '@/lib/spotify';

interface SpotifyPlaybackState {
    is_playing: boolean;
    progress_ms: number | null;
    item: {
        name: string;
        duration_ms: number;
        artists: { name: string }[];
        album: { images: { url: string }[] };
    } | null;
    device: { name: string } | null;
}

// GET - current playback state for the widget
export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const accessToken = await getValidSpotifyAccessToken(user.id);
        if (!accessToken) {
            return NextResponse.json({ error: 'Spotify not connected' }, { status: 400 });
        }

        const response = await fetch('https://api.spotify.com/v1/me/player', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.status === 204) {
            return NextResponse.json({ isPlaying: false, track: null, device: null });
        }

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch playback state' }, { status: 502 });
        }

        const state: SpotifyPlaybackState = await response.json();

        return NextResponse.json({
            isPlaying: state.is_playing,
            device: state.device?.name ?? null,
            track: state.item
                ? {
                    name: state.item.name,
                    artist: state.item.artists.map((a) => a.name).join(', '),
                    albumArt: state.item.album.images[0]?.url ?? null,
                    durationMs: state.item.duration_ms,
                    progressMs: state.progress_ms ?? 0,
                }
                : null,
        });
    } catch (error) {
        console.error('Error fetching Spotify playback state:', error);
        return NextResponse.json({ error: 'Failed to fetch playback state' }, { status: 500 });
    }
}

// POST - play/pause/next/previous on the athlete's active device
export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const accessToken = await getValidSpotifyAccessToken(user.id);
        if (!accessToken) {
            return NextResponse.json({ error: 'Spotify not connected' }, { status: 400 });
        }

        const { action } = await request.json();
        const endpoints: Record<string, { path: string; method: string }> = {
            play: { path: 'play', method: 'PUT' },
            pause: { path: 'pause', method: 'PUT' },
            next: { path: 'next', method: 'POST' },
            previous: { path: 'previous', method: 'POST' },
        };

        const endpoint = endpoints[action];
        if (!endpoint) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const response = await fetch(`https://api.spotify.com/v1/me/player/${endpoint.path}`, {
            method: endpoint.method,
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.status === 404) {
            return NextResponse.json({ error: 'no_active_device' }, { status: 404 });
        }

        if (!response.ok && response.status !== 204) {
            const errorBody = await response.text();
            console.error('Spotify player action failed:', response.status, errorBody);
            return NextResponse.json({ error: 'Failed to control playback' }, { status: 502 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error controlling Spotify playback:', error);
        return NextResponse.json({ error: 'Failed to control playback' }, { status: 500 });
    }
}
