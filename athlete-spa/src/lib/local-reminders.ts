import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isWeeklySummaryEnabled, isWorkoutRemindersEnabled } from '@/lib/app-permissions';

/**
 * Przypomnienia planowane lokalnie na telefonie (bez backendu): przed
 * zaplanowanymi treningami oraz cotygodniowe podsumowanie. Za każdym razem
 * kasujemy poprzedni zestaw i planujemy od nowa, więc zmiana w kalendarzu albo
 * w ustawieniach od razu przesuwa powiadomienia. W przeglądarce nic nie robi.
 */

/** Stałe identyfikatory — kolejny `schedule` z tym samym id zastępuje poprzedni. */
const WORKOUT_IDS = [7201, 7202, 7203, 7204, 7205];
const WEEKLY_SUMMARY_ID = 7301;
const CHANNEL_ID = 'reminders';
const HOUR_MS = 3_600_000;

export interface WorkoutReminderInput {
  title: string;
  /** Epoch ms zaplanowanego startu. */
  at: number;
  /** Ekran otwierany po stuknięciu w powiadomienie. */
  openPath: string;
}

export interface WorkoutReminder {
  id: number;
  title: string;
  body: string;
  at: Date;
  url: string;
}

/** Ostatnio widziany plan — przełącznik w ustawieniach planuje z niego bez ponownego pobierania. */
let lastWorkouts: WorkoutReminderInput[] = [];

export function isLocalRemindersSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications');
}

/**
 * Czysta część: kiedy przypomnieć o każdym treningu. Trening z godziną —
 * godzinę wcześniej; wpis na cały dzień (północ) — o 9:00 tego dnia.
 */
export function buildWorkoutReminders(workouts: WorkoutReminderInput[], now: Date = new Date()): WorkoutReminder[] {
  const reminders: WorkoutReminder[] = [];
  for (const workout of [...workouts].sort((a, b) => a.at - b.at)) {
    if (reminders.length >= WORKOUT_IDS.length) break;
    const start = new Date(workout.at);
    const allDay = start.getHours() === 0 && start.getMinutes() === 0;
    const at = allDay ? new Date(start.getFullYear(), start.getMonth(), start.getDate(), 9) : new Date(workout.at - HOUR_MS);
    if (at.getTime() <= now.getTime()) continue;
    const time = start.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    reminders.push({
      id: WORKOUT_IDS[reminders.length],
      title: allDay ? 'Dziś trening' : `Trening o ${time}`,
      body: `${workout.title} czeka w planie. Powodzenia!`,
      at,
      url: workout.openPath,
    });
  }
  return reminders;
}

async function cancel(ids: number[]): Promise<void> {
  await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
}

/** Zgoda systemowa + kanał; pytamy dopiero, gdy jest co zaplanować. */
async function ensureReady(): Promise<boolean> {
  let permission = await LocalNotifications.checkPermissions();
  if (permission.display === 'prompt' || permission.display === 'prompt-with-rationale') {
    permission = await LocalNotifications.requestPermissions();
  }
  if (permission.display !== 'granted') return false;

  if (Capacitor.getPlatform() === 'android') {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Przypomnienia',
      description: 'Zaplanowane treningi i tygodniowe podsumowanie',
      importance: 4,
    });
  }
  return true;
}

export async function scheduleWorkoutReminders(workouts: WorkoutReminderInput[]): Promise<void> {
  lastWorkouts = workouts;
  if (!isLocalRemindersSupported()) return;
  try {
    await cancel(WORKOUT_IDS);
    if (!isWorkoutRemindersEnabled()) return;

    const reminders = buildWorkoutReminders(workouts);
    if (reminders.length === 0 || !(await ensureReady())) return;

    await LocalNotifications.schedule({
      notifications: reminders.map(reminder => ({
        id: reminder.id,
        title: reminder.title,
        body: reminder.body,
        channelId: CHANNEL_ID,
        schedule: { at: reminder.at, allowWhileIdle: true },
        extra: { url: reminder.url },
      })),
    });
  } catch (error) {
    console.warn('Workout reminders unavailable:', error);
  }
}

/** Co niedzielę o 18:00 — zaproszenie do obejrzenia tygodnia w historii. */
export async function syncWeeklySummaryReminder(): Promise<void> {
  if (!isLocalRemindersSupported()) return;
  try {
    await cancel([WEEKLY_SUMMARY_ID]);
    if (!isWeeklySummaryEnabled() || !(await ensureReady())) return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: WEEKLY_SUMMARY_ID,
          title: 'Twój tydzień w liczbach',
          body: 'Sprawdź, ile treningów i kilometrów udało się zebrać w tym tygodniu.',
          channelId: CHANNEL_ID,
          // Wtyczka liczy dni tygodnia od niedzieli = 1.
          schedule: { on: { weekday: 1, hour: 18, minute: 0 }, allowWhileIdle: true },
          extra: { url: '/athlete/history' },
        },
      ],
    });
  } catch (error) {
    console.warn('Weekly summary reminder unavailable:', error);
  }
}

/** Po zmianie przełączników w ustawieniach. */
export function resyncLocalReminders(): void {
  void scheduleWorkoutReminders(lastWorkouts);
  void syncWeeklySummaryReminder();
}

/** Przy wylogowaniu — przypomnienia należą do konta, które je zaplanowało. */
export async function cancelLocalReminders(): Promise<void> {
  lastWorkouts = [];
  if (!isLocalRemindersSupported()) return;
  try {
    await cancel([...WORKOUT_IDS, WEEKLY_SUMMARY_ID]);
  } catch (error) {
    console.warn('Cancelling reminders failed:', error);
  }
}
