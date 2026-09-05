'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format, addMinutes, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
    CalendarDays,
    CalendarClock,
    Clock,
    MapPin,
    User,
    CheckCircle,
    CheckCircle2,
    Dumbbell,
    Play,
    ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { useCollection, useUser } from '@/lib/db-hooks';
import type { PlannedWorkout, WorkoutLog } from '@/lib/types';
import { SessionDetailsDialog, type TrainingSessionData } from '@/components/schedule/SessionDetailsDialog';
import type { CalendarEvent } from '@/components/schedule/FullCalendarWrapper';
import { DayStrip } from '@/components/schedule/DayStrip';
import {
    LoggedExerciseList,
    PlannedExerciseList,
    getLoggedWorkoutStats,
    seriesLabel,
    exercisesLabel,
} from '@/components/schedule/WorkoutExerciseList';

const statusColors = {
    scheduled: { bg: '#f97316', border: '#ea580c', text: '#ffffff' },
    confirmed: { bg: '#22c55e', border: '#16a34a', text: '#ffffff' },
    completed: { bg: '#6b7280', border: '#4b5563', text: '#ffffff' },
    cancelled: { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },
    workout: { bg: '#8b5cf6', border: '#7c3aed', text: '#ffffff' },
    planned: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' },
};

type EventTone = 'orange' | 'violet' | 'blue';

const toneClasses: Record<EventTone, string> = {
    orange: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
    violet: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
};

function EventGroup({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="space-y-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            {children}
        </div>
    );
}

function EventTriggerHeader({
    icon,
    tone,
    title,
    subtitle,
    badge,
}: {
    icon: ReactNode;
    tone: EventTone;
    title: string;
    subtitle: string;
    badge: ReactNode;
}) {
    return (
        <div className="flex min-w-0 flex-1 items-center gap-3 pr-2">
            <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', toneClasses[tone])}>
                {icon}
            </span>
            <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold sm:text-base">{title}</p>
                    <span className="shrink-0">{badge}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
            </div>
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            <span className="shrink-0 text-muted-foreground">{icon}</span>
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

export default function CalendarPage() {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const { user } = useUser();
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

        return events;
    }, [trainingSessions, workoutHistory, plannedWorkouts]);

    // Wydarzenia na wybrany dzień
    const selectedDayEvents = useMemo(() => {
        return {
            trainerSessions: trainingSessions?.filter(ts =>
                ts.status !== 'cancelled' && isSameDay(new Date(ts.date), selectedDate)
            ) || [],
            workouts: workoutHistory?.filter(w =>
                w.endTime && isSameDay(new Date(w.endTime), selectedDate)
            ) || [],
            planned: plannedWorkouts?.filter(p =>
                isSameDay(new Date(p.date), selectedDate)
            ) || [],
        };
    }, [trainingSessions, workoutHistory, plannedWorkouts, selectedDate]);

    const handleSessionClick = (session: TrainingSessionData) => {
        setSelectedSession(session);
        setIsDetailsDialogOpen(true);
    };

    const isLoading = sessionsLoading || plannedLoading || trainingSessionsLoading;
    const hasEvents = selectedDayEvents.trainerSessions.length > 0 ||
        selectedDayEvents.workouts.length > 0 ||
        selectedDayEvents.planned.length > 0;

    return (
        <div className="container mx-auto max-w-7xl p-4 pb-0 md:p-8">
            <div className="mb-6 flex items-center gap-3">
                <span className="hero-ember flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-glow">
                    <CalendarDays className="h-5 w-5" />
                </span>
                <div>
                    <h1 className="font-headline text-2xl font-extrabold tracking-tight md:text-3xl">Kalendarz treningowy</h1>
                    <p className="text-sm text-muted-foreground">Wszystkie Twoje treningi w jednym miejscu</p>
                </div>
            </div>

            {/* Legend */}
            <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1 text-xs md:flex-wrap md:text-sm">
                <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: statusColors.scheduled.bg }} />
                    <span className="font-medium">Z trenerem</span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: statusColors.confirmed.bg }} />
                    <span className="font-medium">Potwierdzone</span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: statusColors.workout.bg }} />
                    <span className="font-medium">Ukończone</span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: statusColors.planned.bg }} />
                    <span className="font-medium">Zaplanowane</span>
                </div>
            </div>

            <div className="space-y-6">
                {/* Day strip */}
                <Card className="overflow-hidden">
                    <CardContent className="p-3 md:p-4">
                        {isLoading ? (
                            <Skeleton className="h-28 w-full" />
                        ) : (
                            <DayStrip
                                events={calendarEvents}
                                selectedDate={selectedDate}
                                onDateSelect={setSelectedDate}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Selected Day Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline first-letter:uppercase">
                            {format(selectedDate, 'EEEE, d MMMM', { locale: pl })}
                        </CardTitle>
                        <CardDescription>
                            {hasEvents ? 'Treningi zaplanowane na ten dzień' : 'Brak treningów na ten dzień'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-40 w-full" />
                        ) : !hasEvents ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                Brak treningów. Czas na odpoczynek lub zaplanowanie czegoś!
                            </p>
                        ) : (
                            <Accordion
                                type="multiple"
                                defaultValue={['trainer-0', 'completed-0', 'planned-0']}
                                className="w-full space-y-5"
                            >
                                {/* Sesje z trenerem */}
                                {selectedDayEvents.trainerSessions.length > 0 && (
                                    <EventGroup label="Z trenerem">
                                        {selectedDayEvents.trainerSessions.map((session, index) => {
                                            const sessionDate = new Date(session.date);
                                            const endDate = addMinutes(sessionDate, session.duration);
                                            return (
                                                <AccordionItem
                                                    value={`trainer-${index}`}
                                                    key={session.id}
                                                    className="overflow-hidden rounded-xl border bg-card"
                                                >
                                                    <AccordionTrigger className="px-3 py-3 hover:no-underline sm:px-4">
                                                        <EventTriggerHeader
                                                            icon={<Dumbbell className="h-4 w-4" />}
                                                            tone="orange"
                                                            title={session.title}
                                                            subtitle={`${format(sessionDate, 'HH:mm')} · ${session.duration} min · ${session.trainerName}`}
                                                            badge={
                                                                <Badge className="bg-orange-500 text-white hover:bg-orange-500">
                                                                    {session.status === 'confirmed' ? 'Potwierdzona' : 'Z trenerem'}
                                                                </Badge>
                                                            }
                                                        />
                                                    </AccordionTrigger>
                                                    <AccordionContent className="px-3 sm:px-4">
                                                        <div className="space-y-3 border-t border-border/60 pt-3">
                                                            <div className="grid gap-2">
                                                                <InfoRow
                                                                    icon={<Clock className="h-4 w-4" />}
                                                                    label="Godzina"
                                                                    value={`${format(sessionDate, 'HH:mm')} – ${format(endDate, 'HH:mm')} (${session.duration} min)`}
                                                                />
                                                                <InfoRow
                                                                    icon={<User className="h-4 w-4" />}
                                                                    label="Trener"
                                                                    value={session.trainerName}
                                                                />
                                                                {session.location && (
                                                                    <InfoRow
                                                                        icon={<MapPin className="h-4 w-4" />}
                                                                        label="Miejsce"
                                                                        value={session.location}
                                                                    />
                                                                )}
                                                            </div>
                                                            {session.description && (
                                                                <p className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
                                                                    {session.description}
                                                                </p>
                                                            )}
                                                            <div className="flex flex-wrap gap-2 pt-1">
                                                                {session.status === 'scheduled' && (
                                                                    <Button size="sm" onClick={() => handleSessionClick(session)}>
                                                                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                                                                        Potwierdź udział
                                                                    </Button>
                                                                )}
                                                                <Button variant="outline" size="sm" onClick={() => handleSessionClick(session)}>
                                                                    Szczegóły
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            );
                                        })}
                                    </EventGroup>
                                )}

                                {/* Ukończone treningi */}
                                {selectedDayEvents.workouts.length > 0 && (
                                    <EventGroup label="Ukończone">
                                        {selectedDayEvents.workouts.map((log, index) => {
                                            const stats = getLoggedWorkoutStats(log.exercises);
                                            const subtitle = [
                                                `${stats.exerciseCount} ${exercisesLabel(stats.exerciseCount)}`,
                                                `${stats.setCount} ${seriesLabel(stats.setCount)}`,
                                                stats.volume > 0 ? `${stats.volume.toLocaleString('pl-PL')} kg` : null,
                                                log.duration ? `${log.duration} min` : null,
                                            ].filter(Boolean).join(' · ');

                                            return (
                                                <AccordionItem
                                                    value={`completed-${index}`}
                                                    key={log.id}
                                                    className="overflow-hidden rounded-xl border bg-card"
                                                >
                                                    <AccordionTrigger className="px-3 py-3 hover:no-underline sm:px-4">
                                                        <EventTriggerHeader
                                                            icon={<CheckCircle2 className="h-4 w-4" />}
                                                            tone="violet"
                                                            title={log.workoutName}
                                                            subtitle={subtitle}
                                                            badge={<Badge variant="secondary">Ukończono</Badge>}
                                                        />
                                                    </AccordionTrigger>
                                                    <AccordionContent className="px-3 sm:px-4">
                                                        <div className="space-y-3 border-t border-border/60 pt-3">
                                                            <LoggedExerciseList exercises={log.exercises} />
                                                            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                                                                <Link to={`/athlete/history/${log.id}`}>
                                                                    Pełne podsumowanie
                                                                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            );
                                        })}
                                    </EventGroup>
                                )}

                                {/* Zaplanowane */}
                                {selectedDayEvents.planned.length > 0 && (
                                    <EventGroup label="Zaplanowane">
                                        {selectedDayEvents.planned.map((plan, index) => {
                                            const planDate = new Date(plan.date);
                                            const exerciseCount = plan.exercises?.length ?? 0;
                                            const workoutId = (plan as { workoutId?: string }).workoutId;
                                            return (
                                                <AccordionItem
                                                    value={`planned-${index}`}
                                                    key={plan.id}
                                                    className="overflow-hidden rounded-xl border bg-card"
                                                >
                                                    <AccordionTrigger className="px-3 py-3 hover:no-underline sm:px-4">
                                                        <EventTriggerHeader
                                                            icon={<CalendarClock className="h-4 w-4" />}
                                                            tone="blue"
                                                            title={plan.workoutName}
                                                            subtitle={`${format(planDate, 'HH:mm')} · ${exerciseCount} ${exercisesLabel(exerciseCount)}`}
                                                            badge={<Badge variant="secondary">Zaplanowano</Badge>}
                                                        />
                                                    </AccordionTrigger>
                                                    <AccordionContent className="px-3 sm:px-4">
                                                        <div className="space-y-3 border-t border-border/60 pt-3">
                                                            <PlannedExerciseList exercises={plan.exercises} />
                                                            {workoutId && (
                                                                <div className="flex flex-wrap gap-2 pt-1">
                                                                    <Button size="sm" asChild>
                                                                        <Link to={`/athlete/log?workoutId=${workoutId}`}>
                                                                            <Play className="mr-1.5 h-3.5 w-3.5" /> Rozpocznij
                                                                        </Link>
                                                                    </Button>
                                                                    <Button variant="outline" size="sm" asChild>
                                                                        <Link to={`/athlete/workouts/${workoutId}`}>
                                                                            Szczegóły
                                                                        </Link>
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            );
                                        })}
                                    </EventGroup>
                                )}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Session Details Dialog */}
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
