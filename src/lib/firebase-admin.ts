import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let app: App | null = null;

/**
 * Lazily initializes the Firebase Admin app used to send native push
 * (FCM) messages. Picks up credentials from, in order:
 *  - FIREBASE_SERVICE_ACCOUNT_KEY — the full service account JSON, as one
 *    string (minify it — e.g. `jq -c . service-account.json` — before
 *    pasting into .env so it survives being a single line).
 *  - Ambient application-default credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS
 *    pointing at a key file), for environments that prefer that route.
 *
 * Returns null if neither is configured, so callers can report "not
 * configured" instead of throwing.
 */
function getFirebaseApp(): App | null {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  try {
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      app = initializeApp({ credential: cert(serviceAccount) });
      return app;
    }
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      app = initializeApp();
      return app;
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
  return null;
}

export function isFirebaseAdminConfigured(): boolean {
  return getFirebaseApp() !== null;
}

export interface NativePushPayload {
  title: string;
  body: string;
  /** Optional in-app route (e.g. "/athlete/chat") opened when the notification is tapped. */
  url?: string;
}

export interface NativePushSendResult {
  token: string;
  success: boolean;
  shouldDelete: boolean;
  error?: string;
}

export async function sendNativePush(token: string, payload: NativePushPayload): Promise<NativePushSendResult> {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return { token, success: false, shouldDelete: false, error: 'Firebase Admin not configured' };
  }

  try {
    await getMessaging(firebaseApp).send({
      token,
      notification: { title: payload.title, body: payload.body },
      data: payload.url ? { url: payload.url } : undefined,
      // High priority + the channel the app creates at startup => heads-up banner.
      android: { priority: 'high', notification: { channelId: 'default' } },
    });
    return { token, success: true, shouldDelete: false };
  } catch (error: any) {
    // These codes mean the token is dead (app uninstalled, token rotated,
    // etc.) — the push service itself says so, so it's safe to drop it.
    const deadTokenCodes = [
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token',
      'messaging/invalid-argument',
    ];
    return {
      token,
      success: false,
      shouldDelete: deadTokenCodes.includes(error?.code),
      error: error?.message || 'Unknown error',
    };
  }
}
