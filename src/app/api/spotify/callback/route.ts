import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SpotifyAccount } from '@/models/SpotifyAccount';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/spotify/callback`;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const rawState = searchParams.get('state') || '';
    const error = searchParams.get('error');

    const [userId, platform] = rawState.split(':');
    const isCapacitor = platform === 'capacitor';

    const handleRedirect = (queryParams: string) => {
        if (isCapacitor) {
            const deepLink = `com.athlete.spa://spotify-callback?${queryParams}`;
            const isError = queryParams.includes('spotify_error');
            const title = isError ? 'Błąd połączenia ze Spotify' : 'Połączono ze Spotify!';
            const message = isError
                ? 'Wystąpił błąd podczas łączenia ze Spotify. Możesz wrócić do aplikacji.'
                : 'Konto Spotify zostało pomyślnie połączone. Możesz wrócić do aplikacji.';

            const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>
    window.location.href = "${deepLink}";
  </script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px 20px; background-color: #0f172a; color: #f8fafc;">
  <h2 style="font-size: 24px; margin-bottom: 12px;">${title}</h2>
  <p style="color: #94a3b8; margin-bottom: 24px;">${message}</p>
  <a href="${deepLink}" style="display: inline-block; padding: 12px 24px; background: #1DB954; color: white; border-radius: 12px; text-decoration: none; font-weight: 600;">Wróć do aplikacji</a>
</body>
</html>`;
            return new NextResponse(html, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            });
        }

        return NextResponse.redirect(
            `${process.env.NEXTAUTH_URL}/athlete/profile?${queryParams}`
        );
    };

    try {
        if (error) {
            return handleRedirect(`spotify_error=${error}`);
        }

        if (!code || !userId) {
            return handleRedirect('spotify_error=missing_params');
        }

        if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
            return handleRedirect('spotify_error=config_error');
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
                redirect_uri: REDIRECT_URI,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Spotify token exchange failed:', errorData);
            return handleRedirect('spotify_error=token_exchange_failed');
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

        return handleRedirect('spotify_connected=true');
    } catch (error) {
        console.error('Error in Spotify callback:', error);
        return handleRedirect('spotify_error=server_error');
    }
}
