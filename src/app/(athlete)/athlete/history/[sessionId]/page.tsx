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
import { ArrowLeft, Dumbbell, Activity, Clock, MessageSquare, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useDoc, useCollection, useUser } from '@/lib/db-hooks';
import type { WorkoutLog, Exercise, Gym } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

export default function SessionSummaryPage() {
  const { user } = useUser();
  const router = useRouter();
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
            <div className="grid grid-cols-3 gap-4">
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
        <Button onClick={() => router.push('/history')} variant="outline" className="mt-4">
          Wróć do historii
        </Button>
      </div>
    );
  }

  const totalVolume = workoutLog.exercises.reduce((acc, ex) => {
    const exerciseDetails = ex.exercise;
    if (exerciseDetails?.type !== 'weight') return acc;
    const exVolume = ex.sets.reduce((setAcc, set) => setAcc + (set.reps || 0) * (set.weight || 0), 0);
    return acc + exVolume;
  }, 0);

  return (
    <div className="container mx-auto max-w-3xl p-4 md:p-8">
      <Button onClick={() => router.push('/history')} variant="ghost" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Wróć do Historii
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">{workoutLog.workoutName}</CardTitle>
          <CardDescription className="text-lg">
            {workoutLog.endTime ? format(new Date(workoutLog.endTime), 'd MMMM yyyy, HH:mm', { locale: pl }) : '...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {workoutLog.photoURL && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <Image src={workoutLog.photoURL} alt={`Zdjęcie z treningu ${workoutLog.workoutName}`} layout="fill" objectFit="cover" />
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
                <div className="text-2xl font-bold">{workoutLog.exercises.length}</div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="mb-4 font-headline text-xl">Szczegóły sesji</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Ćwiczenie</TableHead>
                  <TableHead>Seria</TableHead>
                  <TableHead className="text-right">Wynik</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workoutLog.exercises.map((ex, exIndex) => {
                  const exerciseDetails = ex.exercise;

                  return ex.sets.map((set, setIndex) => (
                    <TableRow key={`${exIndex}-${setIndex}`}>
                      {setIndex === 0 ? (
                        <TableCell rowSpan={ex.sets.length} className="font-medium align-top">
                          {exerciseDetails?.name || 'Nieznane Ćwiczenie'}
                        </TableCell>
                      ) : null}
                      <TableCell>{setIndex + 1}</TableCell>
                      <TableCell className="text-right">
                        {exerciseDetails?.type === 'duration'
                          ? `${set.duration || 0} sek.`
                          : `${set.reps || 0} ${exerciseDetails?.type === 'weight' ? `x ${set.weight || 0}kg` : 'powt.'}`
                        }
                      </TableCell>
                    </TableRow>
                  ));
                })}
              </TableBody>
            </Table>
          </div>

          {workoutLog.feedback && (
            <div>
              <h3 className="mb-4 font-headline text-xl">Feedback od Trenera</h3>
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
