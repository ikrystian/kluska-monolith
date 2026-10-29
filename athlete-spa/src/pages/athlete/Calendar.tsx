'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, addMinutes, isSameDay, isValid, parse } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useUser } from '@/lib/db-hooks';
import type { PlannedWorkout, WorkoutLog, RunningSession, StravaActivity } from '@/lib/types';
import { SessionDetailsDialog, type TrainingSessionData } from '@/components/schedule/SessionDetailsDialog';
import type { CalendarEvent } from '@/components/schedule/FullCalendarWrapper';
import { DayStrip } from '@/components/schedule/DayStrip';
import { AgendaCard } from '@/components/schedule/AgendaCard';
import { EventSheet } from '@/components/schedule/EventSheet';
import { KIND_COLOR, KIND_LABEL, type AgendaEvent, type AgendaRun } from '@/components/schedule/agenda';

const statusColors = {
    scheduled: { bg: '#f97316', border: '#ea580c', text: '#ffffff' },
    confirmed: { bg: '#22c55e', border: '#16a34a', text: '#ffffff' },
    completed: { bg: '#6b7280', border: '#4b5563', text: '#ffffff' },
    cancelled: { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },
    workout: { bg: '#8b5cf6', border: '#7c3aed', text: '#ffffff' },
    planned: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' },
    run: { bg: '#0ea5e9', border: '#0284c7', text: '#ffffff' },
};

type RunCalendarItem = AgendaRun;

/** `?date=2026-11-07` (e.g. from the home-screen widget) → that day; anything else → null. */
const parseDateParam = (value: string | null): Date | null => {
    if (!value) return null;
    const date = parse(value, 'yyyy-MM-dd', new Date());
    return isValid(date) ? date : null;
};

export default function CalendarPage() {
    const [searchParams] = useSearchParams();
    const dateParam = searchParams.get('date');
    const [selectedDate, setSelectedDate] = useState<Date>(() => parseDateParam(dateParam) ?? new Date());
    // The page stays mounted when a widget link lands on it again with another day.
    useEffect(() => {
        const date = parseDateParam(dateParam);
        if (date) setSelectedDate(date);
    }, [dateParam]);
    const { user } = useUser();
    const [openEvent, setOpenEvent] = useState<AgendaEvent | null>(null);
    const [selectedSession, setSelectedSession] = useState<TrainingSessionData | null>(null);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

    const { data: workoutHistory, isLoading: sessionsLoading } = useCollection<WorkoutLog>(
        user ? 'workoutLogs' : null,
        { athleteId: user?.uid }
    );
    const { data: plannedWorkouts, isLoading: plannedLoading } = useCollection<PlannedWorkout>(
        user ? 'plannedWorkouts' : null,
        { ownerId: user?.uid }
    );

    // Pobierz sesje treningowe z trenerem
    const { data: trainingSessions, isLoading: trainingSessionsLoading, refetch: refetchSessions } = useCollection<TrainingSessionData>(
        user ? 'trainingSessions' : null,
        { athleteId: user?.uid }
    );

    // Biegi zapisane ręcznie/GPS oraz zaimportowane ze Strava
    const { data: runningSessions, isLoading: runningLoading } = useCollection<RunningSession>(
        user ? 'runningSessions' : null,
        { ownerId: user?.uid }
    );
    const { data: stravaActivities, isLoading: stravaLoading } = useCollection<StravaActivity>(
        user ? 'stravaActivities' : null,
        { ownerId: user?.uid }
    );

    const runs: RunCalendarItem[] = useMemo(() => {
        const items: RunCalendarItem[] = [];

        runningSessions?.forEach((session) => {
            items.push({
                id: session.id,
                date: new Date(session.date),
                title: session.programName || session.notes || 'Bieg',
                distanceKm: session.distance,
                durationMin: session.duration,
                avgPace: session.avgPace,
                isClickable: !!session.polyline,
                href: `/athlete/running/${session.id}`,
            });
        });

        stravaActivities?.forEach((activity) => {
            const distanceKm = activity.distance / 1000;
            const durationMin = activity.movingTime / 60;
            items.push({
                id: activity.id,
                date: new Date(activity.date),
                title: activity.name || 'Bieg (Strava)',
                distanceKm,
                durationMin,
                avgPace: durationMin / distanceKm,
                isClickable: true,
                href: `/athlete/running/strava/${activity.stravaActivityId}`,
            });
        });

        return items;
    }, [runningSessions, stravaActivities]);

    // Konwertuj wszystkie wydarzenia na format FullCalendar
    const calendarEvents: CalendarEvent[] = useMemo(() => {
        const events: CalendarEvent[] = [];

        // Sesje z trenerem
        trainingSessions?.filter(ts => ts.status !== 'cancelled').forEach(session => {
            const startDate = new Date(session.date);
            const endDate = addMinutes(startDate, session.duration);
            const colors = statusColors[session.status] || statusColors.scheduled;

            events.push({
                id: `session-${session.id}`,
                title: `🏋️ ${session.title}`,
                start: startDate,
                end: endDate,
                backgroundColor: colors.bg,
                borderColor: colors.border,
                textColor: colors.text,
                extendedProps: { type: 'trainerSession', data: session },
            });
        });

        // Ukończone treningi
        workoutHistory?.forEach(workout => {
            if (workout.endTime) {
                events.push({
                    id: `workout-${workout.id}`,
                    title: `✅ ${workout.workoutName}`,
                    start: new Date(workout.endTime),
                    allDay: true,
                    backgroundColor: statusColors.workout.bg,
                    borderColor: statusColors.workout.border,
                    textColor: statusColors.workout.text,
                    extendedProps: { type: 'workout', data: workout },
                });
            }
        });

        // Zaplanowane treningi
        plannedWorkouts?.forEach(plan => {
            events.push({
                id: `planned-${plan.id}`,
                title: `📅 ${plan.workoutName}`,
                start: new Date(plan.date),
                allDay: true,
                backgroundColor: statusColors.planned.bg,
                borderColor: statusColors.planned.border,
                textColor: statusColors.planned.text,
                extendedProps: { type: 'planned', data: plan },
            });
        });

        // Biegi
        runs.forEach(run => {
            events.push({
                id: `run-${run.id}`,
                title: `🏃 ${run.title}`,
                start: run.date,
                allDay: true,
                backgroundColor: statusColors.run.bg,
                borderColor: statusColors.run.border,
                textColor: statusColors.run.text,
                extendedProps: { type: 'run', data: run },
            });
        });

        return events;
    }, [trainingSessions, workoutHistory, plannedWorkouts, runs]);


    // Wydarzenia wybranego dnia jako jedna oś czasu
    const agenda: AgendaEvent[] = useMemo(() => {
        const items: AgendaEvent[] = [];
        trainingSessions
            ?.filter(ts => ts.status !== 'cancelled' && isSameDay(new Date(ts.date), selectedDate))
            .forEach(session => items.push({ kind: 'trainer', id: session.id, date: new Date(session.date), session }));
        workoutHistory
            ?.filter(w => w.endTime && isSameDay(new Date(w.endTime), selectedDate))
            .forEach(log => items.push({ kind: 'completed', id: log.id, date: new Date(log.endTime), log }));
        plannedWorkouts
            ?.filter(p => isSameDay(new Date(p.date), selectedDate))
            .forEach(plan => items.push({ kind: 'planned', id: plan.id, date: new Date(plan.date), plan }));
        runs.filter(r => isSameDay(r.date, selectedDate)).forEach(run => items.push({ kind: 'run', id: run.id, date: run.date, run }));
        return items.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [trainingSessions, workoutHistory, plannedWorkouts, runs, selectedDate]);

    const openSessionDialog = (event: Extract<AgendaEvent, { kind: 'trainer' }>) => {
        setOpenEvent(null);
        setSelectedSession(event.session);
        setIsDetailsDialogOpen(true);
    };

    const isLoading = sessionsLoading || plannedLoading || trainingSessionsLoading || runningLoading || stravaLoading;

    return (
        <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-5 pt-20 md:px-6 md:pt-8">
            <header>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Plan</p>
                <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">Kalendarz</h1>
            </header>

            <section className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card p-3 shadow-soft md:p-4">
                {isLoading ? (
                    <Skeleton className="h-28 w-full" />
                ) : (
                    <DayStrip events={calendarEvents} selectedDate={selectedDate} onDateSelect={setSelectedDate} />
                )}
            </section>

            <section>
                <div className="mb-3 flex items-end justify-between gap-3 px-1">
                    <h2 className="font-headline text-xl font-bold first-letter:uppercase">
                        {format(selectedDate, 'EEEE, d MMMM', { locale: pl })}
                    </h2>
                    {agenda.length > 0 && (
                        <span className="text-xs font-semibold text-muted-foreground">{agenda.length} wpisów</span>
                    )}
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-20 rounded-[1.25rem]" />
                        <Skeleton className="h-20 rounded-[1.25rem]" />
                    </div>
                ) : agenda.length === 0 ? (
                    <div className="rounded-[1.75rem] border-2 border-dashed border-border/70 px-6 py-12 text-center">
                        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary">
                            <CalendarDays className="h-6 w-6 text-muted-foreground" />
                        </span>
                        <p className="mt-4 font-headline text-lg font-bold">Wolny dzień</p>
                        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                            Brak treningów. Czas na odpoczynek lub zaplanowanie czegoś!
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {agenda.map(event => (
                            <AgendaCard key={`${event.kind}-${event.id}`} event={event} onOpen={() => setOpenEvent(event)} />
                        ))}
                    </ul>
                )}
            </section>

            <div className="no-scrollbar flex gap-x-4 gap-y-1 overflow-x-auto px-1 text-[11px] text-muted-foreground">
                {(Object.keys(KIND_LABEL) as AgendaEvent['kind'][]).map(kind => (
                    <span key={kind} className="inline-flex shrink-0 items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: KIND_COLOR[kind] }} />
                        {KIND_LABEL[kind]}
                    </span>
                ))}
            </div>

            <EventSheet event={openEvent} onOpenChange={open => !open && setOpenEvent(null)} onOpenSession={openSessionDialog} />

            {/* Dialog zarządzania sesją z trenerem (potwierdzenie / anulowanie) */}
            <SessionDetailsDialog
                session={selectedSession}
                open={isDetailsDialogOpen}
                onOpenChange={setIsDetailsDialogOpen}
                onUpdate={refetchSessions}
                isTrainer={false}
            />
        </div>
    );
}
