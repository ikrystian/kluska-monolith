'use client';

import { useState, useMemo } from 'react';
import { format, addMinutes } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarDays, Plus, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useCollection, useUser, useDoc } from '@/lib/db-hooks';
import { CreateSessionDialog } from '@/components/schedule/CreateSessionDialog';
import { SessionDetailsDialog, type TrainingSessionData } from '@/components/schedule/SessionDetailsDialog';
import { SessionCard } from '@/components/schedule/SessionCard';
import { FullCalendarWrapper, type CalendarEvent } from '@/components/schedule/FullCalendarWrapper';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: 'athlete' | 'trainer' | 'admin';
    trainerId?: string;
}

const statusColors = {
    scheduled: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' },
    confirmed: { bg: '#22c55e', border: '#16a34a', text: '#ffffff' },
    completed: { bg: '#6b7280', border: '#4b5563', text: '#ffffff' },
    cancelled: { bg: '#ef4444', border: '#dc2626', text: '#ffffff' },
};

export default function SchedulePage() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<TrainingSessionData | null>(null);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const { user } = useUser();

    const { data: userProfile } = useDoc<UserProfile>(
        user ? 'users' : null,
        user?.uid || null
    );

    // Pobierz sesje treningowe dla trenera
    const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useCollection<TrainingSessionData>(
        user ? 'trainingSessions' : null,
        { trainerId: user?.uid }
    );

    // Pobierz sportowców przypisanych do trenera
    const { data: athletes, isLoading: athletesLoading } = useCollection<UserProfile>(
        user && userProfile?.role === 'trainer' ? 'users' : null,
        { role: 'athlete', trainerId: user?.uid }
    );

    // Konwertuj sesje na format FullCalendar
    const calendarEvents: CalendarEvent[] = useMemo(() => {
        if (!sessions) return [];
        return sessions.map(session => {
            const startDate = new Date(session.date);
            const endDate = addMinutes(startDate, session.duration);
            const colors = statusColors[session.status];
            
            return {
                id: session.id,
                title: `${session.title} - ${session.athleteName}`,
                start: startDate,
                end: endDate,
                backgroundColor: colors.bg,
                borderColor: colors.border,
                textColor: colors.text,
                extendedProps: { session },
            };
        });
    }, [sessions]);

    // Nadchodzące sesje (następne 7 dni)
    const upcomingSessions = useMemo(() => {
        if (!sessions) return [];
        const now = new Date();
        const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return sessions
            .filter(session => {
                const sessionDate = new Date(session.date);
                return sessionDate >= now && sessionDate <= weekLater && session.status !== 'cancelled';
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 5);
    }, [sessions]);

    const handleEventClick = (eventId: string, event: CalendarEvent) => {
        const session = event.extendedProps?.session as TrainingSessionData;
        if (session) {
            setSelectedSession(session);
            setIsDetailsDialogOpen(true);
        }
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setIsCreateDialogOpen(true);
    };

    const isLoading = sessionsLoading || athletesLoading;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="flex flex-col gap-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
                            <CalendarDays className="h-8 w-8" />
                            Harmonogram
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Zarządzaj sesjami treningowymi ze sportowcami
                        </p>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!athletes?.length}>
                        <Plus className="mr-2 h-4 w-4" />
                        Zaplanuj sesję
                    </Button>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: statusColors.scheduled.bg }} />
                        <span>Zaplanowana</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: statusColors.confirmed.bg }} />
                        <span>Potwierdzona</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: statusColors.completed.bg }} />
                        <span>Ukończona</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: statusColors.cancelled.bg }} />
                        <span>Anulowana</span>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Calendar Card */}
                    <Card className="lg:col-span-3">
                        <CardContent className="p-4">
                            {isLoading ? (
                                <Skeleton className="h-[600px] w-full" />
                            ) : (
                                <FullCalendarWrapper
                                    events={calendarEvents}
                                    onEventClick={handleEventClick}
                                    onDateClick={handleDateClick}
                                    initialView="dayGridMonth"
                                    height={600}
                                />
                            )}
                        </CardContent>
                    </Card>

                    {/* Side Panel */}
                    <div className="space-y-6">
                        {/* Upcoming Sessions */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="font-headline text-lg flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Nadchodzące
                                </CardTitle>
                                <CardDescription>
                                    Najbliższe 7 dni
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="space-y-3">
                                        <Skeleton className="h-16 w-full" />
                                        <Skeleton className="h-16 w-full" />
                                    </div>
                                ) : upcomingSessions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Brak nadchodzących sesji
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {upcomingSessions.map((session) => (
                                            <SessionCard
                                                key={session.id}
                                                session={session}
                                                onClick={() => {
                                                    setSelectedSession(session);
                                                    setIsDetailsDialogOpen(true);
                                                }}
                                                compact
                                            />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Athletes */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="font-headline text-lg flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Sportowcy
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {athletesLoading ? (
                                    <Skeleton className="h-20 w-full" />
                                ) : !athletes?.length ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Brak sportowców
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {athletes.slice(0, 5).map((athlete) => {
                                            const athleteSessions = sessions?.filter(s => s.athleteId === athlete.id && s.status !== 'cancelled') || [];
                                            return (
                                                <div key={athlete.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                                                    <span className="font-medium text-sm truncate">{athlete.name}</span>
                                                    <Badge variant="outline" className="text-xs shrink-0">
                                                        {athleteSessions.length}
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Create Session Dialog */}
            <CreateSessionDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                athletes={athletes || []}
                onSuccess={refetchSessions}
                defaultDate={selectedDate}
            />

            {/* Session Details Dialog */}
            <SessionDetailsDialog
                session={selectedSession}
                open={isDetailsDialogOpen}
                onOpenChange={setIsDetailsDialogOpen}
                onUpdate={refetchSessions}
                isTrainer={true}
            />
        </div>
    );
}
