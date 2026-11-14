import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { apiFetch } from '@/lib/api-client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const NATIVE_TOKEN_KEY = 'athlete-spa:native-push-token';
/** Must match `android.notification.channelId` in the backend's FCM payload. */
export const NATIVE_PUSH_CHANNEL_ID = 'default';

/** The high-importance Android channel FCM messages target (heads-up banners). Idempotent. */
async function ensureNativePushChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  await PushNotifications.createChannel({
    id: NATIVE_PUSH_CHANNEL_ID,
    name: 'Powiadomienia',
    importance: 4,
    visibility: 1,
  });
}

async function sendNativeTokenToBackend(token: string): Promise<boolean> {
  window.localStorage.setItem(NATIVE_TOKEN_KEY, token);
  const response = await apiFetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform: Capacitor.getPlatform(),
      token,
      userAgent: navigator.userAgent,
    }),
  });
  return response.ok;
}

/**
 * Web Push (service worker + Push API) — the path for a regular browser tab.
 * Only about what the browser can do; whether the server has a VAPID key is a
 * separate question answered by `getVapidPublicKey`.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Why a Web Push subscription attempt ended the way it did:
 * - `unsupported`: this browser lacks the Push API (or the page isn't HTTPS)
 * - `not-configured`: the server has no VAPID key — nothing the user can fix
 * - `failed`: transient (network, push service) — worth retrying later
 */
export type PushSubscribeResult = 'ok' | 'unsupported' | 'not-configured' | 'failed';

let vapidKeyPromise: Promise<string | null> | null = null;

/**
 * The server's VAPID public key: the build-time env value when present,
 * otherwise asked from the backend (the single source of truth). Resolves
 * null when the server has none; throws when the backend can't be reached.
 */
function getVapidPublicKey(): Promise<string | null> {
  if (VAPID_PUBLIC_KEY) return Promise.resolve(VAPID_PUBLIC_KEY);
  if (!vapidKeyPromise) {
    vapidKeyPromise = (async () => {
      const response = await apiFetch('/api/push/vapid-public-key');
      if (response.status === 503 || response.status === 404) return null;
      if (!response.ok) throw new Error(`VAPID key request failed: ${response.status}`);
      const { publicKey } = (await response.json()) as { publicKey?: string };
      return publicKey || null;
    })();
    // Don't cache a failure — the next attempt should ask again.
    vapidKeyPromise.catch(() => {
      vapidKeyPromise = null;
    });
  }
  return vapidKeyPromise;
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const bytes = new Uint8Array(a);
  return bytes.length === b.length && bytes.every((byte, i) => byte === b[i]);
}

/**
 * Native push (FCM on Android / APNs on iOS) via the Capacitor plugin — the
 * path required inside the wrapped app. The in-page `Notification` API a
 * plain browser uses doesn't reflect the real OS notification permission
 * here and can't deliver anything while the WebView isn't running, so this
 * must go through `@capacitor/push-notifications` instead.
 */
export function isNativePushSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications');
}

/** Web Push wants the VAPID key as a Uint8Array, not the base64url string it's handed out as. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Registers the service worker (idempotent) and subscribes it to Web Push,
 * then hands the subscription to the backend so an admin can target this
 * device. The result says why it didn't work, so the UI can tell a browser
 * limitation from a server misconfiguration from a passing network error.
 */
export async function subscribeToPush(): Promise<PushSubscribeResult> {
  if (!isPushSupported()) return 'unsupported';

  try {
    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) return 'not-configured';
    const applicationServerKey = urlBase64ToUint8Array(vapidKey);

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    // A subscription made under a different VAPID key (rotated since) can
    // never be delivered to, and subscribing over it throws — drop it first.
    if (subscription && !sameKey(subscription.options.applicationServerKey, applicationServerKey)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      });
    }

    const json = subscription.toJSON();
    const response = await apiFetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
        userAgent: navigator.userAgent,
      }),
    });

    return response.ok ? 'ok' : 'failed';
  } catch (error) {
    console.error('Push subscribe failed:', error);
    return 'failed';
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    const endpoint = subscription?.endpoint;

    await subscription?.unsubscribe();
    await apiFetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
  } catch (error) {
    console.error('Push unsubscribe failed:', error);
  }
}

/**
 * Asks the OS for native notification permission (the system dialog, not
 * the web `Notification` prompt) and, once granted, registers this device
 * for FCM/APNs and hands the resulting token to the backend. Resolves false
 * if the user declines or registration never comes back within a few seconds.
 */
export async function subscribeToNativePush(): Promise<boolean> {
  if (!isNativePushSupported()) return false;

  try {
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') return false;

    await ensureNativePushChannel();

    return await new Promise<boolean>((resolve) => {
      let settled = false;

      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        void registrationHandle.then((l) => l.remove());
        void errorHandle.then((l) => l.remove());
        resolve(result);
      };

      const registrationHandle = PushNotifications.addListener('registration', async (token) => {
        try {
          finish(await sendNativeTokenToBackend(token.value));
        } catch {
          finish(false);
        }
      });

      const errorHandle = PushNotifications.addListener('registrationError', () => {
        finish(false);
      });

      void PushNotifications.register();
      setTimeout(() => finish(false), 10_000);
    });
  } catch (error) {
    console.error('Native push subscribe failed:', error);
    return false;
  }
}

/**
 * Takes this device off the account: drops the token on the backend and
 * unregisters from FCM/APNs so nothing more is delivered. Also the logout
 * path — it reads the auth token synchronously, so call it before the
 * session is cleared. Does nothing if this device never registered.
 */
export async function unsubscribeFromNativePush(): Promise<void> {
  try {
    const token = window.localStorage.getItem(NATIVE_TOKEN_KEY);
    if (!token) return;
    window.localStorage.removeItem(NATIVE_TOKEN_KEY);
    const request = apiFetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (isNativePushSupported()) await PushNotifications.unregister();
    await request;
  } catch (error) {
    console.error('Native push unsubscribe failed:', error);
  }
}

export interface NativePushHandlers {
  /** A push arrived while the app is open — Android doesn't show these in the tray. */
  onForeground: (notification: { title?: string; body?: string; data: Record<string, string> }) => void;
  /** The user tapped a notification in the tray. */
  onTap: (data: Record<string, string>) => void;
}

/**
 * Long-lived native push wiring, meant to run once per logged-in session:
 * creates the high-importance Android channel (heads-up banners), keeps the
 * backend in sync when FCM rotates the token, and surfaces foreground and
 * tapped notifications. Does nothing unless the OS permission is already
 * granted — the permission prompt stays in the profile toggle. Returns a
 * cleanup function.
 */
export async function startNativePushSession(handlers: NativePushHandlers): Promise<() => void> {
  if (!isNativePushSupported()) return () => {};

  try {
    const permission = await PushNotifications.checkPermissions();
    if (permission.receive !== 'granted') return () => {};

    await ensureNativePushChannel();

    const handles = await Promise.all([
      PushNotifications.addListener('registration', (token) => {
        sendNativeTokenToBackend(token.value).catch(() => {});
      }),
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Native push registration error:', error);
      }),
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        handlers.onForeground({
          title: notification.title,
          body: notification.body,
          data: (notification.data ?? {}) as Record<string, string>,
        });
      }),
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        handlers.onTap((action.notification.data ?? {}) as Record<string, string>);
      }),
    ]);

    // Emits the current token via the `registration` listener above.
    await PushNotifications.register();

    return () => {
      handles.forEach((handle) => void handle.remove());
    };
  } catch (error) {
    console.error('Native push session failed:', error);
    return () => {};
  }
}
