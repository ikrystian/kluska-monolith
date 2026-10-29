import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { GeoPoint } from '@/lib/geo';

/**
 * Native Android run recorder (RunTrackingPlugin + RunTrackingService in the
 * android project). A foreground service keeps GPS at full rate while the app
 * is backgrounded or the screen is locked, and shows distance / time / average
 * pace in an ongoing notification on the lock screen.
 */

export type NativeRunStatus = 'idle' | 'running' | 'paused';

export interface NativeRunSnapshot {
  status: NativeRunStatus;
  /** Metres covered. */
  distance: number;
  /** Moving time, excluding pauses. */
  durationMs: number;
  accuracy: number | null;
  /** Full route — present on getState/pause/stop, not on live updates. */
  points?: GeoPoint[];
}

export interface NativeRunUpdate extends NativeRunSnapshot {
  /** The fix that just extended the route, when it passed the filter. */
  point?: GeoPoint;
  /**
   * On a status change: true when something other than this plugin's own
   * calls caused it — the home-screen widget's pause/resume button — so the
   * run screen must follow instead of assuming it already knows.
   */
  external?: boolean;
}

interface RunTrackingPlugin {
  start(): Promise<NativeRunSnapshot>;
  pause(): Promise<NativeRunSnapshot>;
  /** Run data is only used to restore a session the native side lost while paused. */
  resume(run: { points: GeoPoint[]; distance: number; durationMs: number }): Promise<NativeRunSnapshot>;
  stop(): Promise<NativeRunSnapshot>;
  getState(): Promise<NativeRunSnapshot>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  isIgnoringBatteryOptimizations(): Promise<{ granted: boolean }>;
  requestIgnoreBatteryOptimizations(): Promise<{ granted: boolean }>;
  addListener(event: 'update', listener: (update: NativeRunUpdate) => void): Promise<PluginListenerHandle>;
}

export const RunTracking = registerPlugin<RunTrackingPlugin>('RunTracking');

export function isNativeRunTrackingAvailable(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('RunTracking');
}

const BATTERY_PROMPTED_KEY = 'athlete-spa:run-battery-exemption-prompted';

/**
 * Asked once, after the first run starts: OEM battery savers (Xiaomi, Samsung,
 * Huawei…) kill even foreground services on long runs unless the app is
 * exempt. Declining is respected — we don't nag on every run.
 */
export async function promptBatteryExemptionOnce(): Promise<void> {
  try {
    if (localStorage.getItem(BATTERY_PROMPTED_KEY)) return;
    localStorage.setItem(BATTERY_PROMPTED_KEY, '1');
  } catch {
    return;
  }
  try {
    await RunTracking.requestIgnoreBatteryOptimizations();
  } catch {
    // Not fatal — the foreground service still records.
  }
}
