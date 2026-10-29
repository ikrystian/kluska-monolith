import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { apiFetch } from '@/lib/api-client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const NATIVE_TOKEN_KEY = 'athlete-spa:native-push-token';
/** Must match `android.notification.channelId` in the backend's FCM payload. */
export const NATIVE_PUSH_CHANNEL_ID = 'default';

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

/** Web Push (service worker + Push API) — the path for a regular browser tab. */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    !!VAPID_PUBLIC_KEY
  );
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
 * device. Returns false if the platform doesn't support it or the browser
 * declines the subscription.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
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

    return response.ok;
  } catch (error) {
    console.error('Push subscribe failed:', error);
    return false;
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

export async function unsubscribeFromNativePush(): Promise<void> {
  try {
    const token = window.localStorage.getItem(NATIVE_TOKEN_KEY);
    window.localStorage.removeItem(NATIVE_TOKEN_KEY);
    await apiFetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
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

    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: NATIVE_PUSH_CHANNEL_ID,
        name: 'Powiadomienia',
        importance: 4,
        visibility: 1,
      });
    }

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
