import { addDays, differenceInCalendarDays, endOfWeek, startOfDay, startOfWeek } from 'date-fns';
import { plural } from '@/components/trainers/trainer-meta';

/** Sportowiec przypisany do trenera (z `users`). */
export interface PanelAthlete {
  id: string;
  name: string;
  avatarUrl?: string;
}

/** Trening z `workoutLogs` — tylko pola potrzebne do listy (bez ćwiczeń). */
export interface PanelLog {
  athleteId: string;
  endTime?: string;
}

/** Sesja z harmonogramu trenera (`trainingSessions`). */
export interface PanelSession {
  id: string;
  athleteId: string;
  athleteName: string;
  title: string;
  date: string;
  duration: number;
  location?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
}

export type AthleteTone = 'ok' | 'warn' | 'idle';

export interface AthleteRow {
  id: string;
  name: string;
  avatarUrl?: string;
  workoutsThisWeek: number;
  lastWorkoutAt: Date | null;
  nextSession: PanelSession | null;
  tone: AthleteTone;
  status: string;
}

export interface PanelStats {
  athletes: number;
  pendingRequests: number;
  sessionsThisWeek: number;
  workoutsLastWeek: number;
  inactive: number;
  activePlans: number;
}

/** Logi pobieramy z tego okna. Sportowiec bez treningu w tym czasie jest „bez aktywności”. */
export const LOG_WINDOW_DAYS = 30;
/** Po tylu dniach bez treningu sportowiec trafia do listy „bez aktywności”. */
export const INACTIVE_AFTER_DAYS = 7;

const TONE_ORDER: Record<AthleteTone, number> = { idle: 0, warn: 1, ok: 2 };

const byDate = (a: PanelSession, b: PanelSession) => new Date(a.date).getTime() - new Date(b.date).getTime();

/** Początek okna logów (ISO). Liczony od północy, więc klucz zapytania SWR nie zmienia się w ciągu dnia. */
export function logWindowStart(now: Date): string {
  return addDays(startOfDay(now), -LOG_WINDOW_DAYS).toISOString();
}

/** Początek bieżącego tygodnia, poniedziałek (ISO). Stabilny w ciągu dnia z tego samego powodu. */
export function weekStartIso(now: Date): string {
  return startOfWeek(now, { weekStartsOn: 1 }).toISOString();
}

/**
 * Wiersz na sportowca. Najpierw ci, którzy wymagają uwagi (bez treningu, potem
 * bez treningu w tym tygodniu), a w każdej grupie alfabetycznie.
 */
export function buildAthleteRows(
  athletes: PanelAthlete[],
  logs: PanelLog[],
  sessions: PanelSession[],
  now: Date
): AthleteRow[] {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const inactiveSince = addDays(now, -INACTIVE_AFTER_DAYS);

  const rows = athletes.map<AthleteRow>(athlete => {
    const endedAt = logs
      .filter(log => log.athleteId === athlete.id && log.endTime)
      .map(log => new Date(log.endTime as string));
    const lastWorkoutAt = endedAt.reduce<Date | null>((latest, at) => (!latest || at > latest ? at : latest), null);
    const workoutsThisWeek = endedAt.filter(at => at >= weekStart).length;
    const nextSession =
      sessions
        .filter(s => s.athleteId === athlete.id && s.status !== 'cancelled' && new Date(s.date) >= now)
        .sort(byDate)[0] ?? null;

    let tone: AthleteTone;
    let status: string;
    if (!lastWorkoutAt) {
      tone = 'idle';
      status = `Brak treningu w ostatnich ${LOG_WINDOW_DAYS} dniach`;
    } else if (lastWorkoutAt < inactiveSince) {
      const days = differenceInCalendarDays(now, lastWorkoutAt);
      tone = 'idle';
      status = `${days} ${plural(days, 'dzień', 'dni', 'dni')} bez treningu`;
    } else if (workoutsThisWeek === 0) {
      tone = 'warn';
      status = 'Brak treningu w tym tygodniu';
    } else {
      tone = 'ok';
      status = `${workoutsThisWeek} ${plural(workoutsThisWeek, 'trening', 'treningi', 'treningów')} w tym tygodniu`;
    }

    return {
      id: athlete.id,
      name: athlete.name,
      avatarUrl: athlete.avatarUrl,
      workoutsThisWeek,
      lastWorkoutAt,
      nextSession,
      tone,
      status,
    };
  });

  return rows.sort(
    (a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone] || a.name.localeCompare(b.name, 'pl')
  );
}

/** Niezrealizowane sesje od dzisiaj na `days` dni w przód, rosnąco po dacie. */
export function upcomingSessions(sessions: PanelSession[], now: Date, days = 7): PanelSession[] {
  const from = startOfDay(now);
  const until = addDays(now, days);
  return sessions
    .filter(s => {
      const at = new Date(s.date);
      return s.status !== 'cancelled' && at >= from && at <= until;
    })
    .sort(byDate);
}

export function buildStats(
  rows: AthleteRow[],
  pendingRequests: number,
  sessions: PanelSession[],
  logs: PanelLog[],
  activePlans: number,
  now: Date
): PanelStats {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekAgo = addDays(now, -7);

  return {
    athletes: rows.length,
    pendingRequests,
    sessionsThisWeek: sessions.filter(s => {
      const at = new Date(s.date);
      return s.status !== 'cancelled' && at >= weekStart && at <= weekEnd;
    }).length,
    workoutsLastWeek: logs.filter(log => log.endTime && new Date(log.endTime) >= weekAgo).length,
    inactive: rows.filter(row => row.tone === 'idle').length,
    activePlans,
  };
}
