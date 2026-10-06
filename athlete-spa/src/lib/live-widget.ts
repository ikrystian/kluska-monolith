import { Capacitor } from '@capacitor/core';
import { CapgoWidgetKit } from '@capgo/capacitor-widget-kit';

/**
 * Bridges an in-progress workout/run to the native Android home-screen widget
 * (ActiveSessionWidgetProvider) through @capgo/capacitor-widget-kit's shared
 * widget-session store. The widget renders natively and ticks its own
 * chronometer, so JS only has to push state when something visible changes.
 */

const WIDGET_ID = 'active-session';
const WIDGET_KIND = 'active-session';

export interface LiveWidgetState {
  activity: 'workout' | 'run';
  title: string;
  /** Primary stat line, e.g. "3/12 serii" or "2.35 km". */
  line1: string;
  /** Secondary stat line, e.g. current exercise or pace. */
  line2: string;
  /** Elapsed time in ms at the moment this state is sent. */
  elapsedMs: number;
  /** False while a run is paused — the widget freezes its clock. */
  running: boolean;
}

export function isLiveWidgetSupported(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('CapgoWidgetKit');
}

function toStatePayload(state: LiveWidgetState) {
  return { ...state, sampledAt: Date.now() };
}

// A previous process may have been killed mid-session, leaving a stale
// "active" session behind. Cleared once at launch; a resumed workout or run
// starts a fresh session right after, because every call below awaits this.
const launchCleanup: Promise<void> = isLiveWidgetSupported()
  ? CapgoWidgetKit.stopWidgetSession({ widgetId: WIDGET_ID }).catch(() => {})
  : Promise.resolve();

export async function startLiveWidget(state: LiveWidgetState): Promise<void> {
  if (!isLiveWidgetSupported()) return;
  try {
    await launchCleanup;
    await CapgoWidgetKit.startWidgetSession({
      widgetId: WIDGET_ID,
      kind: WIDGET_KIND,
      state: toStatePayload(state),
    });
  } catch (error) {
    console.error('Live widget start failed:', error);
  }
}

export async function updateLiveWidget(state: LiveWidgetState): Promise<void> {
  if (!isLiveWidgetSupported()) return;
  try {
    await launchCleanup;
    await CapgoWidgetKit.updateWidgetSession({
      widgetId: WIDGET_ID,
      state: toStatePayload(state),
      merge: true,
    });
  } catch (error) {
    console.error('Live widget update failed:', error);
  }
}

export async function stopLiveWidget(): Promise<void> {
  if (!isLiveWidgetSupported()) return;
  try {
    await launchCleanup;
    await CapgoWidgetKit.stopWidgetSession({ widgetId: WIDGET_ID });
  } catch (error) {
    console.error('Live widget stop failed:', error);
  }
}
