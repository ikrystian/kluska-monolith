'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useCollection, useFirestore, useUser, useMemoFirebase, collection, query, orderBy, where, doc, deleteDoc } from '@/firebase';
import type { WorkoutLog, Exercise } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Loader2, Trash2 } from 'lucide-react';

export default function HistoryPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sessionsRef = useMemoFirebase(() => 
    user ? query(collection(firestore, `users/${user.uid}/workoutSessions`), orderBy('endTime', 'desc')) : null,
    [user, firestore]
  );
  
  const exercisesRef = useMemoFirebase(() => 
    firestore ? collection(firestore, 'exercises') : null,
    [firestore]
  );

  const { data: workoutHistory, isLoading: sessionsLoading } = useCollection<WorkoutLog>(sessionsRef);
  const { data: exercises, isLoading: exercisesLoading } = useCollection<Exercise>(exercisesRef);

  const isLoading = sessionsLoading || exercisesLoading;

  const handleDelete = async (sessionId: string) => {
    if (!user || !firestore) return;
    setDeletingId(sessionId);

    const sessionDocRef = doc(firestore, `users/${user.uid}/workoutSessions`, sessionId);

    try {
        await deleteDoc(sessionDocRef);
        toast({
            title: "Trening usunięty",
            description: "Wybrana sesja treningowa została pomyślnie usunięta.",
            variant: "destructive"
        });
    } catch (e) {
        const permissionError = new FirestorePermissionError({
            path: sessionDocRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setDeletingId(null);
    }
  }


  return (
    <AlertDialog>
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Historia Treningów</h1>
      <Card>
        <CardHeader>
            <CardTitle className="font-headline">Twój Dziennik</CardTitle>
            <CardDescription>Szczegółowy zapis wszystkich Twoich ukończonych treningów.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {isLoading ? (
                Array.from({length: 3}).map((_, i) => (
                    <AccordionItem value={`skeleton-${i}`} key={i} className="border-b">
                        <AccordionTrigger className="hover:no-underline">
                           <Skeleton className="h-10 w-full" />
                        </AccordionTrigger>
                    </AccordionItem>
                ))
            ) : workoutHistory?.map((log) => {
              if (log.status === 'in-progress') return null;

              const totalVolume = log.exercises.reduce((acc, ex) => {
                const exVolume = ex.sets.reduce((setAcc, set) => setAcc + set.reps * (set.weight ?? 0), 0);
                return acc + exVolume;
              }, 0);

              return (
                <AccordionItem value={log.id} key={log.id}>
                  <div className="flex items-center">
                    <AccordionTrigger className="hover:no-underline flex-grow" onClick={() => router.push(`/history/${log.id}`)}>
                      <div className="flex w-full items-center justify-between pr-4">
                        <div className="text-left">
                          <p className="font-semibold">{log.workoutName}</p>
                          <p className="text-sm text-muted-foreground">{format(log.endTime.toDate(), 'd MMMM yyyy', { locale: pl })}</p>
                        </div>
                        <div className="hidden text-right md:block">
                          <p className="font-semibold">{log.duration} min</p>
                          <p className="text-sm text-muted-foreground">Czas trwania</p>
                        </div>
                        <div className="hidden text-right lg:block">
                          <p className="font-semibold">{log.exercises.length}</p>
                          <p className="text-sm text-muted-foreground">Ćwiczenia</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{totalVolume.toLocaleString()} kg</p>
                          <p className="text-sm text-muted-foreground">Objętość</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="mr-2"
                            onClick={(e) => e.stopPropagation()}
                            disabled={deletingId === log.id}
                        >
                            {deletingId === log.id
                                ? <Loader2 className="h-4 w-4 animate-spin"/>
                                : <Trash2 className="h-4 w-4 text-destructive" />
                            }
                        </Button>
                    </AlertDialogTrigger>
                     <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Czy na pewno chcesz usunąć ten trening?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tej operacji nie można cofnąć. To spowoduje trwałe usunięcie treningu "{log.workoutName}" z dnia {format(log.endTime.toDate(), 'd.MM.yyyy')}.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(log.id)} className="bg-destructive hover:bg-destructive/90">
                                Usuń
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                  </div>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
    </AlertDialog>
  );
}
