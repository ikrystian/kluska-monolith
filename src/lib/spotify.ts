import { connectToDatabase } from '@/lib/mongodb';
import { SpotifyAccount } from '@/models/SpotifyAccount';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

function basicAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
}

async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokenResponse> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: basicAuthHeader(),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Spotify token');
  }

  return response.json();
}

/**
 * Returns a valid access token for the user's connected Spotify account,
 * refreshing it first if it has expired. Returns null if the user hasn't
 * connected Spotify.
 */
export async function getValidSpotifyAccessToken(userId: string): Promise<string | null> {
  await connectToDatabase();
  const account = await SpotifyAccount.findOne({ userId });
  if (!account) return null;

  // 1 minute of slack so a token doesn't expire mid-request.
  if (account.tokenExpiresAt.getTime() > Date.now() + 60_000) {
    return account.accessToken;
  }

  const tokenData = await refreshAccessToken(account.refreshToken);
  account.accessToken = tokenData.access_token;
  if (tokenData.refresh_token) {
    account.refreshToken = tokenData.refresh_token;
  }
  account.tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
  await account.save();

  return account.accessToken;
}

export function getSpotifyAuthConfig() {
  return {
    clientId: SPOTIFY_CLIENT_ID,
    clientSecret: SPOTIFY_CLIENT_SECRET,
    basicAuthHeader,
  };
}
