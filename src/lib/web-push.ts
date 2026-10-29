import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not configured');
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Result for one subscription: whether to delete it (push service says it's gone). */
export interface PushSendResult {
  endpoint: string;
  success: boolean;
  shouldDelete: boolean;
  error?: string;
}

export async function sendWebPush(target: PushTarget, payload: PushPayload): Promise<PushSendResult> {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: target.keys },
      JSON.stringify(payload)
    );
    return { endpoint: target.endpoint, success: true, shouldDelete: false };
  } catch (error: any) {
    // 404/410 mean the push service no longer recognizes this subscription
    // (unsubscribed, expired, or the browser data was cleared) — stale, drop it.
    const statusCode = error?.statusCode;
    return {
      endpoint: target.endpoint,
      success: false,
      shouldDelete: statusCode === 404 || statusCode === 410,
      error: error?.body || error?.message || 'Unknown error',
    };
  }
}
