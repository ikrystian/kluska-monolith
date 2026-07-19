import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/strava/callback`;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const rawState = searchParams.get('state') || '';
    const error = searchParams.get('error');

    const [userId, platform] = rawState.split(':');
    const isCapacitor = platform === 'capacitor';

    const handleRedirect = (queryParams: string) => {
        if (isCapacitor) {
            const deepLink = `com.athlete.spa://strava-callback?${queryParams}`;
            const isError = queryParams.includes('strava_error');
            const title = isError ? 'Błąd połączenia ze Strava' : 'Połączono ze Strava!';
            const message = isError
                ? 'Wystąpił błąd podczas łączenia ze Strava. Możesz wrócić do aplikacji.'
                : 'Konto Strava zostało pomyślnie połączone. Możesz wrócić do aplikacji.';

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
  <a href="${deepLink}" style="display: inline-block; padding: 12px 24px; background: #FC4C02; color: white; border-radius: 12px; text-decoration: none; font-weight: 600;">Wróć do aplikacji</a>
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
            return handleRedirect(`strava_error=${error}`);
        }

        if (!code || !userId) {
            return handleRedirect('strava_error=missing_params');
        }

        if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
            return handleRedirect('strava_error=config_error');
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
            return handleRedirect('strava_error=token_exchange_failed');
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
        return handleRedirect('strava_connected=true');
    } catch (error) {
        console.error('Error in Strava callback:', error);
        return handleRedirect('strava_error=server_error');
    }
}
