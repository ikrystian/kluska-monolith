'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isSameDay, format, toDate } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Exercise, PlannedWorkout, WorkoutLog } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function CalendarPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const { user } = useUser();
    const firestore = useFirestore();

    const sessionsRef = useMemoFirebase(() => 
      user ? collection(firestore, `users/${user.uid}/workoutSessions`) : null,
      [user, firestore]
    );
    const plannedRef = useMemoFirebase(() =>
      user ? collection(firestore, `users/${user.uid}/plannedWorkouts`) : null,
      [user, firestore]
    );
    const exercisesRef = useMemoFirebase(() =>
        firestore ? collection(firestore, 'exercises') : null,
        [firestore]
    );
    
    const { data: workoutHistory, isLoading: sessionsLoading } = useCollection<WorkoutLog>(sessionsRef);
    const { data: plannedWorkouts, isLoading: plannedLoading } = useCollection<PlannedWorkout>(plannedRef);
    const { data: exercises, isLoading: exercisesLoading } = useCollection<Exercise>(exercisesRef);

    const workoutDates = new Set(workoutHistory?.filter(wh => wh.endTime).map(wh => format(wh.endTime.toDate(), 'yyyy-MM-dd')) || []);
    const plannedDates = new Set(plannedWorkouts?.filter(pw => pw.date).map(pw => format(pw.date.toDate(), 'yyyy-MM-dd')) || []);

    const selectedDayWorkouts = date && workoutHistory
      ? workoutHistory.filter(workout => workout.endTime && isSameDay(workout.endTime.toDate(), date))
      : [];

    const selectedDayPlanned = date && plannedWorkouts
      ? plannedWorkouts.filter(plan => plan.date && isSameDay(plan.date.toDate(), date))
      : [];

    const isLoading = sessionsLoading || plannedLoading || exercisesLoading;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <h1 className="mb-6 font-headline text-3xl font-bold">Kalendarz treningowy</h1>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardContent className="p-0">
                         <Calendar
                            locale={pl}
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="p-0"
                            classNames={{
                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 p-4",
                                month: "space-y-4 w-full",
                                caption_label: "font-headline text-lg",
                                head_row: "grid grid-cols-7",
                                head_cell: "w-full",
                                row: "grid grid-cols-7 mt-2 w-full",
                                cell: "h-auto p-0 text-center text-sm aspect-square",
                                day: "h-full w-full p-1 aria-selected:opacity-100"
                            }}
                            components={{
                                Day: ({ date, ...props }) => {
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    const hasCompleted = workoutDates.has(dateStr);
                                    const hasPlanned = plannedDates.has(dateStr);
                                    return (
                                        <div 
                                            className="relative h-full w-full flex items-center justify-center"
                                        >
                                            <span>{format(date, 'd')}</span>
                                            {hasCompleted && (
                                                <div className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-primary"></div>
                                            )}
                                             {hasPlanned && !hasCompleted && (
                                                <div className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-accent"></div>
                                            )}
                                        </div>
                                    );
                                },
                            }}
                        />
                         <div className="p-4 flex justify-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-primary" />
                                <span>Ukończony</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-accent" />
                                <span>Zaplanowany</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="font-headline">
                            {date ? format(date, 'EEEE, d MMMM', { locale: pl }) : 'Wybierz dzień'}
                        </CardTitle>
                        <CardDescription>
                           Treningi na ten dzień.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <p className="text-sm text-muted-foreground">Ładowanie treningów...</p> : 
                        (selectedDayWorkouts.length === 0 && selectedDayPlanned.length === 0) ? (
                             <p className="text-sm text-muted-foreground">Brak treningów na ten dzień. Czas na odpoczynek lub zaplanowanie czegoś!</p>
                        ) : (
                            <Accordion type="multiple" defaultValue={['completed-0', 'planned-0']} className="w-full space-y-4">
                                {selectedDayWorkouts.map((log, index) => {
                                    const totalVolume = log.exercises.reduce((acc, ex) => {
                                        const exVolume = ex.sets.reduce((setAcc, set) => setAcc + set.reps * set.weight, 0);
                                        return acc + exVolume;
                                    }, 0);
                                    return (
                                    <AccordionItem value={`completed-${index}`} key={log.id}>
                                        <AccordionTrigger>
                                            <div className="flex justify-between w-full pr-2">
                                                <div className="text-left">
                                                    <p className="font-semibold">{log.workoutName}</p>
                                                    <p className="text-sm text-muted-foreground">{totalVolume.toLocaleString()} kg objętości</p>
                                                </div>
                                                <Badge variant="default">Ukończono</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                        <TableHead>Ćwiczenie</TableHead>
                                                        <TableHead>Seria</TableHead>
                                                        <TableHead>Powt.</TableHead>
                                                        <TableHead className="text-right">Ciężar</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {log.exercises.map((ex, exIndex) => {
                                                        const exerciseDetails = exercises?.find(e => e.id === ex.exerciseId);
                                                        return ex.sets.map((set, setIndex) => (
                                                            <TableRow key={`${exIndex}-${setIndex}`}>
                                                            {setIndex === 0 ? (
                                                                <TableCell rowSpan={ex.sets.length} className="font-medium align-top">
                                                                {exerciseDetails?.name || 'Nieznane'}
                                                                </TableCell>
                                                            ) : null}
                                                            <TableCell>{setIndex + 1}</TableCell>
                                                            <TableCell>{set.reps}</TableCell>
                                                            <TableCell className="text-right">{set.weight}kg</TableCell>
                                                            </TableRow>
                                                        ));
                                                        })}
                                                    </TableBody>
                                                </Table>
                                        </AccordionContent>
                                    </AccordionItem>
                                )})}

                                {selectedDayPlanned.map((plan, index) => (
                                    <AccordionItem value={`planned-${index}`} key={plan.id}>
                                        <AccordionTrigger>
                                            <div className="flex justify-between w-full pr-2">
                                                <div className="text-left">
                                                    <p className="font-semibold">{plan.workoutName}</p>
                                                    <p className="text-sm text-muted-foreground">{plan.exercises.length} ćwiczeń</p>
                                                </div>
                                                <Badge variant="secondary" className="bg-accent text-accent-foreground">Zaplanowano</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <ul className="space-y-2 p-2">
                                                {plan.exercises.map((ex, exIndex) => (
                                                    <li key={exIndex} className="flex justify-between text-sm p-2 rounded-md bg-secondary/50">
                                                        <span>{ex.name}</span>
                                                        <span className="text-muted-foreground">{ex.sets} x {ex.reps} powt.</span>
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
        </div>
    );
}
