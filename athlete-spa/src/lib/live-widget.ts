import { Capacitor } from '@capacitor/core';
import { CapgoWidgetKit } from '@capgo/capacitor-widget-kit';
import { RunTracking, isNativeRunTrackingAvailable } from '@/lib/run-tracking';

/**
 * Bridges the app to the native Android home-screen widget
 * (SessionWidgetProvider in the android project) through
 * @capgo/capacitor-widget-kit's shared widget-session store.
 *
 * The widget has two faces fed by three sessions:
 *  - "active-session": the workout or run in progress. The widget renders it
 *    natively and ticks its own chronometers (elapsed time, rest countdown),
 *    so JS only pushes state when something visible changes.
 *  - "weekly-stats": totals for the last 7 days and the workout streak, and
 *  - "up-next": the next planned workouts — together the face shown while
 *    nothing is in progress.
 * Buttons on the widget come back as widget-to-app messages (see
 * takeWidgetCommands).
 */

const WIDGET_ID = 'active-session';
const WIDGET_KIND = 'active-session';
const STATS_WIDGET_ID = 'weekly-stats';
const UP_NEXT_WIDGET_ID = 'up-next';

export interface LiveWidgetState {
  activity: 'workout' | 'run';
  title: string;
  /** Primary stat line, e.g. the current exercise or "2.35 km". */
  line1: string;
  /** Secondary stat line, e.g. "Seria 2/4 · 80 kg × 8" or pace. */
  line2: string;
  /** Sets done and planned across the workout, drawn as a progress bar; null hides it. */
  setsDone?: number | null;
  setsTotal?: number | null;
  /**
   * Epoch ms the rest between sets ends; null while not resting. The widget
   * counts down to it on its own and offers skip / +30 s.
   */
  restEndsAt?: number | null;
  /** Elapsed time in ms at the moment this state is sent. */
  elapsedMs: number;
  /** False while a run is paused — the widget freezes its clock. */
  running: boolean;
  /** App route opened by tapping the widget. */
  openPath: string;
  /** App route behind the widget's "Zakończ" button. */
  finishPath: string;
  /**
   * Whether the screen that owns this session is open to carry out commands
   * from the widget. A workout's sets live in that screen's form, so without
   * it the widget can only reopen the app.
   */
  interactive: boolean;
}

export interface WeeklyStats {
  workouts: number;
  volumeKg: number;
  distanceKm: number;
  activeMinutes: number;
  /** Oldest to newest, one entry per day of the 7-day window. */
  days: { label: string; count: number }[];
  /** Consecutive days of training, as the gamification profile counts it. */
  streak: number;
}

export interface UpNextWorkout {
  title: string;
  /** Epoch ms of the planned start; the widget words it as "Dziś 18:00", "Jutro", "Pt 7.11". */
  at: number;
  exercises: number;
  /** App route behind the widget's "Start" button. */
  openPath: string;
}

/**
 * Commands the widget can send; the screen that owns the session handles them.
 * Must match the COMMAND_* constants in SessionWidgetProvider.java.
 */
export const WIDGET_COMMAND_COMPLETE_SET = 'completeSet';
export const WIDGET_COMMAND_SKIP_REST = 'skipRest';
export const WIDGET_COMMAND_EXTEND_REST = 'extendRest';
/** How much the widget's "+30 s" adds; must match REST_EXTENSION_MS in SessionWidgetProvider.java. */
export const WIDGET_REST_EXTENSION_SECONDS = 30;

export interface WidgetCommand {
  name: string;
  createdAt: number;
}

export function isLiveWidgetSupported(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('CapgoWidgetKit');
}

/**
 * A previous process may have been killed mid-session, leaving a stale
 * "active" session behind. Cleared once at launch — except a run, which keeps
 * recording natively across a WebView restart and so is still real.
 */
async function clearStaleSession(): Promise<void> {
  try {
    const { session } = await CapgoWidgetKit.getWidgetSession({ widgetId: WIDGET_ID });
    if (!session || session.status !== 'active') return;
    if (session.state.activity === 'run' && isNativeRunTrackingAvailable()) {
      const { status } = await RunTracking.getState();
      if (status !== 'idle') return;
    }
    await CapgoWidgetKit.stopWidgetSession({ widgetId: WIDGET_ID });
  } catch {
    // Nothing worth reporting — the widget treats a leftover session as stale on its own.
  }
}

/**
 * Every call below runs through this queue, so a read-then-write (see
 * ensureWorkoutWidget) can't interleave with another writer and the widget
 * always ends up in the state of the last call made.
 */
let queue: Promise<void> = isLiveWidgetSupported() ? clearStaleSession() : Promise.resolve();

function enqueue(label: string, task: () => Promise<unknown>): Promise<void> {
  if (!isLiveWidgetSupported()) return Promise.resolve();
  queue = queue.then(task).then(
    () => undefined,
    error => console.error(`Live widget ${label} failed:`, error)
  );
  return queue;
}

function toStatePayload(state: LiveWidgetState) {
  // Updates are merged into the stored state, so a field left out would keep
  // its old value: spell out the optional ones.
  return { setsDone: null, setsTotal: null, restEndsAt: null, ...state, sampledAt: Date.now() };
}

export function startLiveWidget(state: LiveWidgetState): Promise<void> {
  return enqueue('start', () =>
    CapgoWidgetKit.startWidgetSession({
      widgetId: WIDGET_ID,
      kind: WIDGET_KIND,
      state: toStatePayload(state),
    })
  );
}

export function updateLiveWidget(state: LiveWidgetState): Promise<void> {
  return enqueue('update', () =>
    CapgoWidgetKit.updateWidgetSession({
      widgetId: WIDGET_ID,
      state: toStatePayload(state),
      merge: true,
    })
  );
}

/**
 * Flips the widget's commands on or off without touching its clock — unlike
 * updateLiveWidget, this does not resample the elapsed time. The rest
 * countdown belongs to the screen, so it goes when the commands do.
 */
export function setLiveWidgetInteractive(interactive: boolean): Promise<void> {
  const state = interactive ? { interactive } : { interactive, restEndsAt: null };
  return enqueue('interactive', () => CapgoWidgetKit.updateWidgetSession({ widgetId: WIDGET_ID, state, merge: true }));
}

export function stopLiveWidget(): Promise<void> {
  return enqueue('stop', () => CapgoWidgetKit.stopWidgetSession({ widgetId: WIDGET_ID }));
}

/**
 * Shows an in-progress workout the workout screen isn't driving (the athlete
 * navigated away, or the app was restarted) — title and clock only. Leaves a
 * richer session from the workout screen alone.
 */
export function ensureWorkoutWidget(workout: { title: string; startedAt: number; openPath: string; finishPath: string }): Promise<void> {
  return enqueue('ensure', async () => {
    const { session } = await CapgoWidgetKit.getWidgetSession({ widgetId: WIDGET_ID });
    if (session?.status === 'active' && session.state.activity === 'workout') return;
    const state: LiveWidgetState = {
      activity: 'workout',
      title: workout.title,
      line1: 'W toku',
      line2: '',
      elapsedMs: Math.max(0, Date.now() - workout.startedAt),
      running: true,
      openPath: workout.openPath,
      finishPath: workout.finishPath,
      interactive: false,
    };
    await CapgoWidgetKit.startWidgetSession({ widgetId: WIDGET_ID, kind: WIDGET_KIND, state: toStatePayload(state) });
  });
}

/** Clears the widget's workout, e.g. once it was discarded elsewhere. A run is left alone. */
export function stopWorkoutWidget(): Promise<void> {
  return enqueue('stop workout', async () => {
    const { session } = await CapgoWidgetKit.getWidgetSession({ widgetId: WIDGET_ID });
    if (session?.status === 'active' && session.state.activity === 'workout') {
      await CapgoWidgetKit.stopWidgetSession({ widgetId: WIDGET_ID });
    }
  });
}

export function publishWeeklyStats(stats: WeeklyStats): Promise<void> {
  // Replaces the whole session: the shape is fixed, so there is nothing to merge.
  return enqueue('weekly stats', () =>
    CapgoWidgetKit.startWidgetSession({
      widgetId: STATS_WIDGET_ID,
      kind: STATS_WIDGET_ID,
      state: { ...stats, sampledAt: Date.now() },
    })
  );
}

/** Replaces the planned workouts shown on the idle face; past ones are skipped by the widget itself. */
export function publishUpNext(workouts: UpNextWorkout[]): Promise<void> {
  return enqueue('up next', () =>
    CapgoWidgetKit.startWidgetSession({
      widgetId: UP_NEXT_WIDGET_ID,
      kind: UP_NEXT_WIDGET_ID,
      state: { workouts, sampledAt: Date.now() },
    })
  );
}

/** Commands the widget's buttons queued since the last call, oldest first; each is delivered once. */
export async function takeWidgetCommands(): Promise<WidgetCommand[]> {
  if (!isLiveWidgetSupported()) return [];
  try {
    const { messages } = await CapgoWidgetKit.listWidgetMessages({
      widgetId: WIDGET_ID,
      direction: 'widgetToApp',
      unacknowledgedOnly: true,
    });
    if (messages.length === 0) return [];
    await CapgoWidgetKit.acknowledgeWidgetMessages({ messageIds: messages.map(message => message.messageId) });
    return messages
      .map(({ name, createdAt }) => ({ name, createdAt }))
      .sort((a, b) => a.createdAt - b.createdAt);
  } catch (error) {
    console.error('Reading widget commands failed:', error);
    return [];
  }
}
