import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isWorkoutRemindersEnabled } from '@/lib/app-permissions';
import type { PetState } from '@/models/types/pet';

/**
 * Powiadomienia „od zwierzaka”, planowane lokalnie na telefonie — backend nie
 * ma harmonogramu. Przy każdej zmianie stanu kasujemy stare i planujemy od
 * nowa, więc nakarmienie albo trening od razu przesuwają przypomnienia.
 * W przeglądarce nic nie robi.
 */

const HUNGRY_ID = 7101;
const IDLE_ID = 7102;
const LAZY_ID = 7103;
const CHANNEL_ID = 'pet';
const DAY_MS = 86_400_000;

export function isPetNotificationsSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('LocalNotifications');
}

/** Nie budzimy nikogo w nocy: godziny 22–8 przesuwamy na 9:00. */
export function atCivilHour(date: Date): Date {
  const result = new Date(date);
  const hour = result.getHours();
  if (hour >= 22) result.setDate(result.getDate() + 1);
  if (hour >= 22 || hour < 8) result.setHours(9, 0, 0, 0);
  return result;
}

export interface PetReminder {
  id: number;
  title: string;
  body: string;
  at: Date;
}

/** Czysta część: co i kiedy zaplanować dla danego stanu. */
export function buildPetReminders(state: PetState, now: Date = new Date()): PetReminder[] {
  const pet = state.pets.find(entry => entry.id === state.activePetId);
  if (!pet) return [];
  const reminders: PetReminder[] = [];

  if (pet.hungryAt) {
    const at = atCivilHour(new Date(pet.hungryAt));
    if (at.getTime() > now.getTime()) {
      reminders.push({ id: HUNGRY_ID, title: `${pet.name} zgłodniał`, body: 'Burczy mi w brzuszku. Wpadniesz mnie nakarmić?', at });
    }
  }

  // Od ostatniego aktywnego dnia: po 2 dniach zaproszenie, po 5 — łagodne „zasiedziałem się”.
  const lastActive = state.lastActiveDay ? new Date(`${state.lastActiveDay}T18:00:00`) : now;
  const idleAt = atCivilHour(new Date(Math.max(lastActive.getTime() + 2 * DAY_MS, now.getTime() + DAY_MS)));
  reminders.push({
    id: IDLE_ID,
    title: `${pet.name} czeka na trening`,
    body: 'Zjadłem już śniadanie, ale przydałoby się spalić trochę kalorii. Idziemy poćwiczyć?',
    at: idleAt,
  });
  reminders.push({
    id: LAZY_ID,
    title: `${pet.name} trochę się rozleniwił`,
    body: 'Zasiedziałem się na kanapie. Jeden trening i znów będę pełen energii!',
    at: atCivilHour(new Date(idleAt.getTime() + 3 * DAY_MS)),
  });

  return reminders;
}

export async function cancelPetNotifications(): Promise<void> {
  if (!isPetNotificationsSupported()) return;
  await LocalNotifications.cancel({ notifications: [{ id: HUNGRY_ID }, { id: IDLE_ID }, { id: LAZY_ID }] });
}

export async function schedulePetNotifications(state: PetState): Promise<void> {
  if (!isPetNotificationsSupported()) return;
  try {
    await cancelPetNotifications();
    if (!isWorkoutRemindersEnabled()) return;

    const reminders = buildPetReminders(state);
    if (reminders.length === 0) return;

    // Prosimy o zgodę dopiero, gdy użytkownik ma zwierzaka — nie przy pierwszym uruchomieniu.
    let permission = await LocalNotifications.checkPermissions();
    if (permission.display === 'prompt' || permission.display === 'prompt-with-rationale') {
      permission = await LocalNotifications.requestPermissions();
    }
    if (permission.display !== 'granted') return;

    if (Capacitor.getPlatform() === 'android') {
      await LocalNotifications.createChannel({ id: CHANNEL_ID, name: 'Zwierzak', description: 'Wiadomości od Twojego pupila', importance: 3 });
    }

    await LocalNotifications.schedule({
      notifications: reminders.map(reminder => ({
        id: reminder.id,
        title: reminder.title,
        body: reminder.body,
        channelId: CHANNEL_ID,
        schedule: { at: reminder.at, allowWhileIdle: true },
        extra: { url: '/athlete/pet' },
      })),
    });
  } catch (error) {
    console.warn('Pet notifications unavailable:', error);
  }
}
