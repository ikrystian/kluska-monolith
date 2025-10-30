'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Loader2, Footprints, TrendingUp, Route, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, addDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import type { RunningSession } from '@/lib/types';

const runSchema = z.object({
  distance: z.coerce.number().positive('Dystans musi być liczbą dodatnią.'),
  duration: z.coerce.number().positive('Czas trwania musi być liczbą dodatnią.'),
  notes: z.string().optional(),
});

type RunFormValues = z.infer<typeof runSchema>;

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string; value: string; icon: React.ElementType; isLoading: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{value}</div>}
    </CardContent>
  </Card>
);

export default function RunningPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);

  const runningSessionsRef = useMemoFirebase(() => 
    user ? query(collection(firestore, `users/${user.uid}/runningSessions`), orderBy('date', 'desc')) : null,
    [user, firestore]
  );
  
  const { data: runningSessions, isLoading } = useCollection<RunningSession>(runningSessionsRef);

  const stats = useMemo(() => {
    if (!runningSessions) {
      return { totalRuns: 0, totalDistance: 0, totalDuration: 0, overallAvgPace: 0 };
    }
    const totalRuns = runningSessions.length;
    const totalDistance = runningSessions.reduce((acc, session) => acc + session.distance, 0);
    const totalDuration = runningSessions.reduce((acc, session) => acc + session.duration, 0);
    const overallAvgPace = totalDistance > 0 ? totalDuration / totalDistance : 0;

    return { totalRuns, totalDistance, totalDuration, overallAvgPace };
  }, [runningSessions]);

  const formatPace = (pace: number) => {
    if (pace === 0) return `0'00"/km`;
    const paceMinutes = Math.floor(pace);
    const paceSeconds = Math.round((pace - paceMinutes) * 60);
    return `${paceMinutes}'${paceSeconds.toString().padStart(2, '0')}"/km`;
  };

  const form = useForm<RunFormValues>({
    resolver: zodResolver(runSchema),
    defaultValues: {
      distance: '',
      duration: '',
      notes: '',
    },
  });

  const onSubmit = async (data: RunFormValues) => {
    if (!user || !firestore) return;

    const avgPace = data.duration / data.distance;

    const newRun: Omit<RunningSession, 'id'> = {
      date: Timestamp.now(),
      distance: data.distance,
      duration: data.duration,
      avgPace: avgPace,
      notes: data.notes,
      ownerId: user.uid,
    };

    const runCollection = collection(firestore, `users/${user.uid}/runningSessions`);

    addDoc(runCollection, newRun)
      .then(() => {
        toast({
          title: 'Bieg Zapisany!',
          description: 'Twoja sesja biegowa została dodana do historii.',
        });
        form.reset();
        setDialogOpen(false);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: runCollection.path,
          operation: 'create',
          requestResourceData: newRun,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-headline text-3xl font-bold">Dziennik Biegowy</h1>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Dodaj Bieg
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-headline">Zarejestruj Nowy Bieg</DialogTitle>
              <DialogDescription>Wprowadź szczegóły swojego ostatniego treningu biegowego.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="distance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dystans (km)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="np. 5.2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Czas (min)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="np. 28.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notatki (opcjonalnie)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Jak się czułeś/aś? Jaka była pogoda?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={form.formState.isSubmitting}>Anuluj</Button>
                  </DialogClose>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Zapisz Bieg
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

       <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Wszystkie biegi" value={stats.totalRuns.toString()} icon={Footprints} isLoading={isLoading} />
          <StatCard title="Łączny dystans" value={`${stats.totalDistance.toFixed(2)} km`} icon={Route} isLoading={isLoading} />
          <StatCard title="Całkowity czas" value={`${Math.round(stats.totalDuration)} min`} icon={Timer} isLoading={isLoading} />
          <StatCard title="Średnie tempo" value={formatPace(stats.overallAvgPace)} icon={TrendingUp} isLoading={isLoading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historia Biegów</CardTitle>
          <CardDescription>Zapis wszystkich Twoich sesji biegowych.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Dystans</TableHead>
                <TableHead>Czas</TableHead>
                <TableHead>Średnie Tempo</TableHead>
                <TableHead>Notatki</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : runningSessions && runningSessions.length > 0 ? (
                runningSessions.map((session) => {
                  return (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{format(session.date.toDate(), 'd MMM yyyy, HH:mm', { locale: pl })}</TableCell>
                      <TableCell>{session.distance.toFixed(2)} km</TableCell>
                      <TableCell>{session.duration.toFixed(1)} min</TableCell>
                      <TableCell>{formatPace(session.avgPace)}</TableCell>
                      <TableCell className="text-muted-foreground">{session.notes}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Footprints className="h-8 w-8" />
                        <span>Nie zarejestrowano jeszcze żadnych biegów.</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
