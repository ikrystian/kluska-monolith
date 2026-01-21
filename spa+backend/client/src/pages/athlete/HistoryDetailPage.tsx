'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Dumbbell, Activity, Clock, MessageSquare, Repeat, Timer, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useDoc, useUser } from '@/lib/db-hooks';
import type { WorkoutLog } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate, useParams } from 'react-router-dom';
import Image from 'next/image';
import { type ExerciseType } from '@/lib/set-type-config';
import { SetTypeBadge } from '@/components/workout/SetTypeModal';

export default function HistoryDetailPage() {
    const { user } = useUser();
    const navigate = useNavigate();
    const params = useParams();
    const sessionId = params.sessionId as string;

    const { data: workoutLog, isLoading: sessionLoading } = useDoc<WorkoutLog>('workoutLogs', sessionId);

    const isLoading = sessionLoading;

    if (isLoading) {
        return (
            <div className="container mx-auto max-w-3xl p-4 md:p-8">
                <Skeleton className="h-8 w-48 mb-6" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-7 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="h-48 w-full" />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!workoutLog) {
        return (
            <div className="container mx-auto p-4 md:p-8 text-center">
                <h2 className="text-xl font-semibold">Nie znaleziono sesji</h2>
                <p className="text-muted-foreground">Nie można załadować podsumowania treningu.</p>
                <Button onClick={() => navigate('/athlete/history')} variant="outline" className="mt-4">
                    Wróć do historii
                </Button>
            </div>
        );
    }

    const totalVolume = workoutLog.exercises?.reduce((acc, ex) => {
        const exerciseDetails = ex.exercise;
        if (exerciseDetails?.type !== 'weight') return acc;
        const exVolume = ex.sets?.reduce((setAcc, set) => setAcc + (set.reps || 0) * (set.weight || 0), 0) || 0;
        return acc + exVolume;
    }, 0) || 0;

    return (
        <div className="container mx-auto max-w-3xl p-4 md:p-8">
            <Button onClick={() => navigate('/athlete/history')} variant="ghost" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Wróć do Historii
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl sm:text-3xl">{workoutLog.workoutName}</CardTitle>
                    <CardDescription className="text-base sm:text-lg">
                        {workoutLog.endTime ? format(new Date(workoutLog.endTime), 'd MMMM yyyy, HH:mm', { locale: pl }) : '...'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {workoutLog.photoURL && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                            <Image src={workoutLog.photoURL} alt={`Zdjęcie z treningu ${workoutLog.workoutName}`} fill className="object-cover" />
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Card className="bg-secondary/30">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Całkowita objętość</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalVolume.toLocaleString()} kg</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-secondary/30">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Czas trwania</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{workoutLog.duration || '-'} min</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-secondary/30">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ćwiczenia</CardTitle>
                                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{workoutLog.exercises?.length || 0}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* New Personal Records Section */}
                    {workoutLog.newRecords && workoutLog.newRecords.length > 0 && (
                        <div>
                            <h3 className="mb-4 text-xl flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-yellow-500" />
                                Nowe Rekordy!
                            </h3>
                            <div className="grid gap-2">
                                {workoutLog.newRecords.map((record, idx) => (
                                    <Card key={idx} className="bg-yellow-500/10 border-yellow-500/30">
                                        <CardContent className="p-3 flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                                <span className="font-medium truncate">{record.exerciseName}</span>
                                            </div>
                                            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 w-fit flex-shrink-0">
                                                {record.type === 'max_weight' && `${record.value} kg @ ${record.reps} powt.`}
                                                {record.type === 'max_reps' && `${record.value} powtórzeń`}
                                                {record.type === 'max_duration' && `${record.value} sek.`}
                                            </Badge>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="mb-4 text-xl">Szczegóły sesji</h3>

                        {/* Mobile View - Card Layout */}
                        <div className="space-y-4 md:hidden">
                            {workoutLog.exercises?.map((ex, exIndex) => {
                                const exerciseDetails = ex.exercise;
                                const exerciseType: ExerciseType = exerciseDetails?.type || 'weight';

                                return (
                                    <Card key={exIndex} className="overflow-hidden">
                                        <CardHeader className="bg-secondary/30 py-3 px-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium">{exerciseDetails?.name || 'Nieznane Ćwiczenie'}</span>
                                                    <Badge variant="outline" className="w-fit text-[10px] gap-1">
                                                        {exerciseType === 'weight' && <Dumbbell className="h-2.5 w-2.5" />}
                                                        {exerciseType === 'reps' && <Repeat className="h-2.5 w-2.5" />}
                                                        {exerciseType === 'duration' && <Timer className="h-2.5 w-2.5" />}
                                                        {exerciseType === 'weight' ? 'Ciężar' : exerciseType === 'reps' ? 'Powt.' : 'Czas'}
                                                    </Badge>
                                                </div>
                                                <Badge variant="secondary" className="text-xs">
                                                    {ex.sets?.length || 0} {(ex.sets?.length || 0) === 1 ? 'seria' : (ex.sets?.length || 0) < 5 ? 'serie' : 'serii'}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="divide-y divide-border">
                                                {ex.sets?.map((set, setIndex) => (
                                                    <div key={setIndex} className="flex items-center justify-between px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                                                                {setIndex + 1}
                                                            </span>
                                                            <SetTypeBadge type={set.type} />
                                                        </div>
                                                        <span className="font-mono text-sm font-medium">
                                                            {exerciseType === 'duration'
                                                                ? `${set.duration || 0} sek.`
                                                                : exerciseType === 'weight'
                                                                    ? `${set.weight || 0}kg × ${set.reps || 0}`
                                                                    : `${set.reps || 0} powt.`
                                                            }
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Desktop View - Table Layout */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[200px]">Ćwiczenie</TableHead>
                                        <TableHead>Seria</TableHead>
                                        <TableHead>Typ</TableHead>
                                        <TableHead className="text-right">Wynik</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {workoutLog.exercises?.map((ex, exIndex) => {
                                        const exerciseDetails = ex.exercise;
                                        const exerciseType: ExerciseType = exerciseDetails?.type || 'weight';

                                        return ex.sets?.map((set, setIndex) => (
                                            <TableRow key={`${exIndex}-${setIndex}`}>
                                                {setIndex === 0 ? (
                                                    <TableCell rowSpan={ex.sets?.length || 1} className="font-medium align-top">
                                                        <div className="flex flex-col gap-1">
                                                            <span>{exerciseDetails?.name || 'Nieznane Ćwiczenie'}</span>
                                                            <Badge variant="outline" className="w-fit text-[10px] gap-1">
                                                                {exerciseType === 'weight' && <Dumbbell className="h-2.5 w-2.5" />}
                                                                {exerciseType === 'reps' && <Repeat className="h-2.5 w-2.5" />}
                                                                {exerciseType === 'duration' && <Timer className="h-2.5 w-2.5" />}
                                                                {exerciseType === 'weight' ? 'Ciężar' : exerciseType === 'reps' ? 'Powt.' : 'Czas'}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                ) : null}
                                                <TableCell>{setIndex + 1}</TableCell>
                                                <TableCell>
                                                    <SetTypeBadge type={set.type} />
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {exerciseType === 'duration'
                                                        ? `${set.duration || 0} sek.`
                                                        : exerciseType === 'weight'
                                                            ? `${set.weight || 0}kg × ${set.reps || 0}`
                                                            : `${set.reps || 0} powt.`
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        ));
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {workoutLog.feedback && (
                        <div>
                            <h3 className="mb-4 text-xl">Feedback od Trenera</h3>
                            <Card className="bg-secondary/30">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <MessageSquare className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                                        <p className="text-muted-foreground italic">"{workoutLog.feedback}"</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
