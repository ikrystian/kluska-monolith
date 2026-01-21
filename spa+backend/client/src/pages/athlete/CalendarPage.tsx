'use client';

import { useState, useMemo } from 'react';
import { format, addMinutes, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarDays, Clock, MapPin, User, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useUser } from '@/lib/db-hooks';
import type { Exercise, PlannedWorkout, WorkoutLog } from '@/lib/types';
import { SessionDetailsDialog, type TrainingSessionData } from '@/components/schedule/SessionDetailsDialog';
import { FullCalendarWrapper, type CalendarEvent } from '@/components/schedule/FullCalendarWrapper';

const statusColors = {
    scheduled: { bg: '#f97316', border: '#ea580c', text: '#ffffff' },
    confirmed: { bg: '#22c55e', border: '#16a34a', text: '#ffffff' },
    completed: { bg: '#6b7280', border: '#4b5563', text: '#ffffff' },
    cancelled: { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },
    workout: { bg: '#8b5cf6', border: '#7c3aed', text: '#ffffff' },
    planned: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' },
};

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
        { userId: user?.uid }
    );
    const { data: exercises, isLoading: exercisesLoading } = useCollection<Exercise>('exercises');

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
            const colors = statusColors[session.status as keyof typeof statusColors] || statusColors.scheduled;

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

    const handleEventClick = (eventId: string, event: CalendarEvent) => {
        if (event.extendedProps?.type === 'trainerSession') {
            setSelectedSession(event.extendedProps.data);
            setIsDetailsDialogOpen(true);
        }
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
    };

    const handleSessionClick = (session: TrainingSessionData) => {
        setSelectedSession(session);
        setIsDetailsDialogOpen(true);
    };

    const isLoading = sessionsLoading || plannedLoading || exercisesLoading || trainingSessionsLoading;
    const hasEvents = selectedDayEvents.trainerSessions.length > 0 ||
        selectedDayEvents.workouts.length > 0 ||
        selectedDayEvents.planned.length > 0;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="mb-6 text-3xl font-bold flex items-center gap-2">
                <CalendarDays className="h-8 w-8" />
                Kalendarz treningowy
            </h1>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm mb-6">
                <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full shrink-0" style={{ backgroundColor: statusColors.scheduled.bg }} />
                    <span>Z trenerem</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full shrink-0" style={{ backgroundColor: statusColors.confirmed.bg }} />
                    <span>Potwierdzone</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full shrink-0" style={{ backgroundColor: statusColors.workout.bg }} />
                    <span>Ukończone</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 md:h-3 md:w-3 rounded-full shrink-0" style={{ backgroundColor: statusColors.planned.bg }} />
                    <span>Zaplanowane</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Calendar */}
                <Card className="lg:col-span-2 overflow-hidden">
                    <CardContent className="p-2 md:p-4">
                        {isLoading ? (
                            <Skeleton className="h-[350px] md:h-[500px] w-full" />
                        ) : (
                            <FullCalendarWrapper
                                events={calendarEvents}
                                onEventClick={handleEventClick}
                                onDateClick={handleDateClick}
                                initialView="dayGridMonth"
                                height="auto"
                                className="calendar-mobile-fix"
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Selected Day Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {format(selectedDate, 'EEEE, d MMMM', { locale: pl })}
                        </CardTitle>
                        <CardDescription>
                            {hasEvents ? 'Treningi na ten dzień' : 'Brak treningów na ten dzień'}
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
                            <Accordion type="multiple" defaultValue={['trainer-0', 'completed-0', 'planned-0']} className="w-full space-y-2">
                                {/* Sesje z trenerem */}
                                {selectedDayEvents.trainerSessions.map((session, index) => {
                                    const sessionDate = new Date(session.date);
                                    return (
                                        <AccordionItem value={`trainer-${index}`} key={session.id} className="border rounded-lg px-2 md:px-3">
                                            <AccordionTrigger className="py-3">
                                                <div className="flex flex-col sm:flex-row sm:justify-between w-full pr-2 gap-1 sm:gap-2">
                                                    <div className="text-left min-w-0 flex-1">
                                                        <p className="font-semibold text-sm truncate">{session.title}</p>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <User className="h-3 w-3 shrink-0" />
                                                            <span className="truncate">{session.trainerName}</span>
                                                        </p>
                                                    </div>
                                                    <Badge className="bg-orange-500 hover:bg-orange-600 text-xs shrink-0 self-start sm:self-center">
                                                        {session.status === 'confirmed' ? 'Potwierdzona' : 'Z trenerem'}
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-2 pb-2">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                                        <span>{format(sessionDate, 'HH:mm')} ({session.duration} min)</span>
                                                    </div>
                                                    {session.location && (
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                                            <span>{session.location}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex gap-2 pt-2">
                                                        {session.status === 'scheduled' && (
                                                            <Button size="sm" onClick={() => handleSessionClick(session)}>
                                                                <CheckCircle className="mr-1 h-3 w-3" />
                                                                Potwierdź
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

                                {/* Ukończone treningi */}
                                {selectedDayEvents.workouts.map((log, index) => {
                                    const totalVolume = log.exercises?.reduce((acc, ex) => {
                                        const exVolume = ex.sets?.reduce((setAcc, set) => setAcc + (set.reps || 0) * (set.weight || 0), 0) || 0;
                                        return acc + exVolume;
                                    }, 0) || 0;
                                    return (
                                        <AccordionItem value={`completed-${index}`} key={log.id} className="border rounded-lg px-2 md:px-3">
                                            <AccordionTrigger className="py-3">
                                                <div className="flex flex-col sm:flex-row sm:justify-between w-full pr-2 gap-1 sm:gap-2">
                                                    <div className="text-left min-w-0 flex-1">
                                                        <p className="font-semibold text-sm truncate">{log.workoutName}</p>
                                                        <p className="text-xs text-muted-foreground">{totalVolume.toLocaleString()} kg</p>
                                                    </div>
                                                    <Badge variant="default" className="text-xs shrink-0 self-start sm:self-center">Ukończono</Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="text-xs">Ćwiczenie</TableHead>
                                                            <TableHead className="text-xs">Seria</TableHead>
                                                            <TableHead className="text-xs text-right">Ciężar</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {log.exercises?.slice(0, 3).map((ex, exIndex) => {
                                                            const exerciseDetails = exercises?.find(e => e.id === ex.exerciseId);
                                                            return (
                                                                <TableRow key={exIndex}>
                                                                    <TableCell className="text-xs">{exerciseDetails?.name || ex.exercise?.name || 'Nieznane'}</TableCell>
                                                                    <TableCell className="text-xs">{ex.sets?.length || 0}</TableCell>
                                                                    <TableCell className="text-xs text-right">{ex.sets?.[0]?.weight || 0}kg</TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}

                                {/* Zaplanowane */}
                                {selectedDayEvents.planned.map((plan, index) => (
                                    <AccordionItem value={`planned-${index}`} key={plan.id} className="border rounded-lg px-2 md:px-3">
                                        <AccordionTrigger className="py-3">
                                            <div className="flex flex-col sm:flex-row sm:justify-between w-full pr-2 gap-1 sm:gap-2">
                                                <div className="text-left min-w-0 flex-1">
                                                    <p className="font-semibold text-sm truncate">{plan.workoutName}</p>
                                                    <p className="text-xs text-muted-foreground">{plan.exercises?.length || 0} ćwiczeń</p>
                                                </div>
                                                <Badge variant="secondary" className="bg-accent text-accent-foreground text-xs shrink-0 self-start sm:self-center">Zaplanowano</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <ul className="space-y-1">
                                                {plan.exercises?.slice(0, 4).map((ex, exIndex) => (
                                                    <li key={exIndex} className="text-xs flex justify-between p-1.5 rounded bg-secondary/50">
                                                        <span>{ex.name}</span>
                                                        <span className="text-muted-foreground">{ex.sets} x {ex.reps}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
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
