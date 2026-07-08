import { Device } from '@capacitor/device';

const DEVICE_ID_STORAGE_KEY = 'athlete-spa:device-id';

/**
 * Stable identifier of the device this app runs on, used to bind a guest
 * account to the device. Natively Capacitor returns the platform identifier
 * (ANDROID_ID / identifierForVendor); the localStorage fallback covers web
 * dev and any plugin failure, and keeps the id stable once generated.
 */
export async function getDeviceId(): Promise<string> {
  const stored = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (stored) return stored;

  let id: string;
  try {
    const { identifier } = await Device.getId();
    id = identifier;
  } catch {
    id = crypto.randomUUID();
  }

  localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
  return id;
}
