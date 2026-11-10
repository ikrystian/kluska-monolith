import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { isAllowedOrigin } from '@/lib/allowed-origins';

/**
 * Shared plumbing for the "connect Strava / Spotify" OAuth flows.
 *
 * Three clients start them:
 *  - the athlete SPA in the Capacitor app — opens /connect in an in-app
 *    browser tab (Custom Tab); the callback hands control back to the app
 *    through the `leniwakluska.com://app/...` deep link registered in
 *    AndroidManifest.xml,
 *  - the athlete SPA in a browser — passes `returnTo` (its own URL) and is
 *    sent back to the settings tab of that URL,
 *  - the legacy Next.js web app — no `returnTo`, lands on /athlete/profile.
 *
 * The `state` is a short-lived signed token, so a forged callback can't attach
 * someone else's Strava/Spotify account to a user, nor redirect anywhere.
 */

export type OAuthProvider = 'strava' | 'spotify';
type Platform = 'capacitor' | 'web';

interface OAuthState {
  sub: string;
  provider: OAuthProvider;
  platform: Platform;
  /** SPA base URL (origin + path, no hash) to return to; web only. */
  returnTo?: string;
}

const STATE_AUDIENCE = 'oauth-connect';
const STATE_MAX_AGE = 15 * 60; // the user has 15 minutes to finish the consent screen

/** Deep link prefix handled by the app (see NativeDeepLinks in the SPA). */
const APP_DEEP_LINK = 'leniwakluska.com://app';
/** SPA route with the integrations section. */
const SETTINGS_ROUTE = '/athlete/you?tab=settings';

export function getOAuthRedirectUri(provider: OAuthProvider): string {
  return `${process.env.NEXTAUTH_URL}/api/${provider}/callback`;
}

/** Accepts only an http(s) URL on an origin the SPA is served from; returns it without query/hash. */
function sanitizeReturnTo(raw: string | null): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    if (!isAllowedOrigin(url.origin)) return undefined;
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}

function stateFromConnectParams(userId: string, provider: OAuthProvider, searchParams: URLSearchParams): OAuthState {
  const platform: Platform = searchParams.get('platform') === 'capacitor' ? 'capacitor' : 'web';
  const returnTo = platform === 'web' ? sanitizeReturnTo(searchParams.get('returnTo')) : undefined;
  return { sub: userId, provider, platform, ...(returnTo ? { returnTo } : {}) };
}

export function createOAuthState(userId: string, provider: OAuthProvider, searchParams: URLSearchParams): string {
  const payload = stateFromConnectParams(userId, provider, searchParams);
  return jwt.sign(payload, env.NEXTAUTH_SECRET, { audience: STATE_AUDIENCE, expiresIn: STATE_MAX_AGE });
}

export function readOAuthState(raw: string | null, provider: OAuthProvider): OAuthState | null {
  if (!raw) return null;
  try {
    const payload = jwt.verify(raw, env.NEXTAUTH_SECRET, { audience: STATE_AUDIENCE }) as OAuthState;
    return payload.provider === provider && payload.sub ? payload : null;
  } catch {
    return null;
  }
}

/**
 * /connect failed before reaching the provider (signed out, missing config):
 * send the browser back to where it came from instead of showing raw JSON in
 * the app's browser tab.
 */
export function oauthConnectFailure(provider: OAuthProvider, searchParams: URLSearchParams, reason: string): NextResponse {
  return oauthResultRedirect(stateFromConnectParams('', provider, searchParams), provider, reason);
}

/**
 * Where the browser goes after the callback. `error` is a short machine code
 * (`access_denied`, `token_exchange_failed`, …); omitted on success.
 */
export function oauthResultRedirect(state: OAuthState | null, provider: OAuthProvider, error?: string): NextResponse {
  const result = new URLSearchParams({ integration: provider, result: error ? 'error' : 'connected' });
  if (error) result.set('reason', error);

  if (state?.platform === 'capacitor') {
    // A server redirect (not a JS one) — Chrome Custom Tabs only hand custom
    // schemes over to the app when the navigation comes from a redirect chain
    // the user started. The app's singleTask activity comes to the front and
    // the Custom Tab is closed with it.
    return NextResponse.redirect(`${APP_DEEP_LINK}${SETTINGS_ROUTE}&${result}`, 302);
  }

  if (state?.returnTo) {
    return NextResponse.redirect(`${state.returnTo}#${SETTINGS_ROUTE}&${result}`, 302);
  }

  if (!state) return expiredStatePage(provider);

  // Legacy Next.js web app.
  const legacy = new URLSearchParams(error ? { [`${provider}_error`]: error } : { [`${provider}_connected`]: 'true' });
  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/athlete/profile?${legacy}`, 302);
}

/**
 * The state expired or was tampered with, so we don't know which client
 * started the flow. Nothing was saved; offer both ways back.
 */
function expiredStatePage(provider: OAuthProvider): NextResponse {
  const label = provider === 'strava' ? 'Strava' : 'Spotify';
  const color = provider === 'strava' ? '#FC4C02' : '#1DB954';
  const appLink = `${APP_DEEP_LINK}${SETTINGS_ROUTE}&integration=${provider}&result=error&reason=expired`;
  const html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Nie udało się połączyć z ${label}</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 48px 20px; background: #0f172a; color: #f8fafc;">
  <h2 style="font-size: 22px; margin-bottom: 12px;">Nie udało się połączyć z ${label}</h2>
  <p style="color: #94a3b8; margin-bottom: 28px;">Sesja łączenia wygasła. Wróć do aplikacji i spróbuj ponownie.</p>
  <a href="${appLink}" style="display: inline-block; padding: 12px 24px; background: ${color}; color: #fff; border-radius: 999px; text-decoration: none; font-weight: 600;">Wróć do aplikacji</a>
</body>
</html>`;
  return new NextResponse(html, { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
