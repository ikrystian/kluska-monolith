'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  Activity,
  CalendarCheck,
  Dumbbell,
  Target,
  CalendarPlus,
  PlusCircle,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { ChartTooltipContent, ChartContainer } from '@/components/ui/chart';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc, where, getDocs, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import type { Goal, WorkoutLog, PlannedWorkout, UserProfile, WorkoutPlan, Exercise, Conversation, AthleteProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Textarea } from '@/components/ui/textarea';


const StatCard = ({ title, value, icon: Icon, description, isLoading }: { title: string, value: string, icon: React.ElementType, description: string, isLoading?: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{value}</div>}
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

function AssignPlanDialog({ athlete, trainerId }: { athlete: UserProfile, trainerId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const trainerPlansQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'workoutPlans'), where('trainerId', '==', trainerId));
  }, [firestore, trainerId]);

  const { data: trainerPlans, isLoading } = useCollection<WorkoutPlan>(trainerPlansQuery);

  const [assignedPlanIds, setAssignedPlanIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (trainerPlans) {
      const currentlyAssigned = trainerPlans
        .filter(plan => plan.assignedAthleteIds.includes(athlete.id))
        .map(plan => plan.id);
      setAssignedPlanIds(currentlyAssigned);
    }
  }, [trainerPlans, athlete.id]);


  const handleAssign = async () => {
    if (!trainerPlans) return;
    setIsAssigning(true);

    const promises = trainerPlans.map(plan => {
      const planRef = doc(firestore, 'workoutPlans', plan.id);
      let newAssignedIds = [...plan.assignedAthleteIds];

      if (assignedPlanIds.includes(plan.id) && !plan.assignedAthleteIds.includes(athlete.id)) {
        // Assign
        newAssignedIds.push(athlete.id);
      } else if (!assignedPlanIds.includes(plan.id) && plan.assignedAthleteIds.includes(athlete.id)) {
        // Unassign
        newAssignedIds = newAssignedIds.filter(id => id !== athlete.id);
      } else {
        return Promise.resolve(); // No change for this plan
      }

      return updateDoc(planRef, { assignedAthleteIds: newAssignedIds }).catch(serverError => {
        const permissionError = new FirestorePermissionError({
          path: planRef.path,
          operation: 'update',
          requestResourceData: { assignedAthleteIds: newAssignedIds },
        });
        errorEmitter.emit('permission-error', permissionError);
        throw serverError; // Propagate error to stop Promise.all
      });
    });

    try {
      await Promise.all(promises);
      toast({
        title: "Plany zaktualizowane!",
        description: `Przypisania planów dla ${athlete.name} zostały zaktualizowane.`,
      });
      setOpen(false);
    } catch (error) {
      console.error("Failed to assign plans:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować przypisań planów.",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCheckboxChange = (planId: string, checked: boolean | "indeterminate") => {
    if(checked) {
        setAssignedPlanIds(prev => [...prev, planId]);
    } else {
        setAssignedPlanIds(prev => prev.filter(id => id !== planId));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><PlusCircle className="mr-2 h-4 w-4" /> Przypisz Plan</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Przypisz plany do {athlete.name}</DialogTitle>
          <DialogDescription>Wybierz plany treningowe, które chcesz przypisać temu sportowcowi.</DialogDescription>
        </DialogHeader>
        <div className="max-h-64 space-y-3 overflow-y-auto p-1">
          {isLoading && <p>Ładowanie planów...</p>}
          {trainerPlans && trainerPlans.map((plan) => (
            <div key={plan.id} className="flex items-center space-x-2 rounded-md border p-3">
              <Checkbox
                id={`plan-${plan.id}`}
                checked={assignedPlanIds.includes(plan.id)}
                onCheckedChange={(checked) => handleCheckboxChange(plan.id, checked)}
              />
              <Label htmlFor={`plan-${plan.id}`} className="font-medium">{plan.name}</Label>
            </div>
          ))}
          {!isLoading && trainerPlans?.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">Nie masz jeszcze żadnych planów treningowych do przypisania.</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="secondary" disabled={isAssigning}>Anuluj</Button></DialogClose>
          <Button onClick={handleAssign} disabled={isAssigning}>
            {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FeedbackDialog({ workout, athleteId }: { workout: WorkoutLog, athleteId: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [feedback, setFeedback] = useState(workout.feedback || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        const workoutRef = doc(firestore, `users/${athleteId}/workoutSessions`, workout.id);

        await updateDoc(workoutRef, { feedback })
            .then(() => {
                toast({ title: 'Sukces', description: 'Feedback został zapisany.'});
                setOpen(false);
            })
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: workoutRef.path,
                    operation: 'update',
                    requestResourceData: { feedback }
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => setIsSaving(false));
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {workout.feedback ? 'Edytuj' : 'Dodaj'} Feedback
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Feedback do treningu: {workout.workoutName}</DialogTitle>
                    <DialogDescription>
                        Data: {format(workout.endTime.toDate(), 'd MMMM yyyy', { locale: pl })}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Napisz swój komentarz do tego treningu..."
                        rows={6}
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary" disabled={isSaving}>Anuluj</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Zapisz
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function AthleteProfilePage() {
  const { user: trainerUser } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const athleteId = params.athleteId as string;
  const { toast } = useToast();

  const athleteProfileRef = useMemoFirebase(() => {
    if (!athleteId) return null;
    return doc(firestore, 'users', athleteId);
  }, [athleteId, firestore]);
  const { data: athleteProfile, isLoading: profileLoading } = useDoc<UserProfile>(athleteProfileRef);

  const sessionsRef = useMemoFirebase(() =>
    athleteId ? query(collection(firestore, `users/${athleteId}/workoutSessions`), orderBy('endTime', 'desc')) : null,
    [athleteId, firestore]
  );
  const goalsRef = useMemoFirebase(() =>
    athleteId ? collection(firestore, `users/${athleteId}/goals`) : null,
    [athleteId, firestore]
  );
  const exercisesRef = useMemoFirebase(() =>
    firestore ? collection(firestore, 'exercises') : null,
    [firestore]
  );

  const upcomingWorkoutQuery = useMemoFirebase(() =>
    athleteId ? query(
      collection(firestore, `users/${athleteId}/plannedWorkouts`),
      orderBy('date', 'asc'),
      limit(1)
    ) : null,
    [athleteId, firestore]
  );

  const { data: workoutHistory, isLoading: sessionsLoading } = useCollection<WorkoutLog>(sessionsRef);
  const { data: goals, isLoading: goalsLoading } = useCollection<Goal>(goalsRef);
  const { data: upcomingWorkouts, isLoading: upcomingWorkoutsLoading } = useCollection<PlannedWorkout>(upcomingWorkoutQuery);
  const { data: exercises, isLoading: exercisesLoading } = useCollection<Exercise>(exercisesRef);

  const nextWorkout = upcomingWorkouts?.[0];

  const totalWorkouts = workoutHistory?.length || 0;
  const totalWeightLifted = workoutHistory?.reduce((acc, log) => {
    if (!log.endTime) return acc;
    return acc + (log.exercises?.reduce((exAcc, ex) =>
      exAcc + (ex.sets?.reduce((setAcc, set) => setAcc + set.reps * (set.weight || 0), 0) || 0)
    , 0) || 0)
  }, 0) || 0;

  const weeklyVolume = workoutHistory?.reduce((acc, log) => {
    if (!log.endTime) return acc;
    const day = format(log.endTime.toDate(), 'eee', { locale: pl });
    const volume = log.exercises.reduce((exAcc, ex) => exAcc + ex.sets.reduce((setAcc, s) => setAcc + s.reps * (s.weight || 0), 0), 0);
    const existing = acc.find(d => d.day === day);
    if (existing) {
      existing.volume += volume;
    } else {
      acc.push({ day, volume });
    }
    return acc;
  }, [] as { day: string; volume: number }[]) || [];

  const handleStartConversation = async () => {
    if (!trainerUser || !athleteProfile) return;

    const conversationId = [trainerUser.uid, athleteProfile.id].sort().join('_');
    const mainConversationRef = doc(firestore, 'conversations', conversationId);

    try {
        const docSnap = await getDoc(mainConversationRef);

        if (!docSnap.exists()) {
            const trainerProfileSnap = await getDoc(doc(firestore, 'users', trainerUser.uid));
            const trainerProfile = trainerProfileSnap.data() as UserProfile;

            const newConversation: Conversation = {
                id: conversationId,
                participants: [trainerUser.uid, athleteProfile.id],
                trainerId: trainerUser.uid,
                athleteId: athleteProfile.id,
                trainerName: trainerProfile.name,
                athleteName: athleteProfile.name,
                lastMessage: null,
                updatedAt: Timestamp.now(),
                unreadCount: {
                  [trainerUser.uid]: 0,
                  [athleteProfile.id]: 0,
                },
            };

            const batch = setDoc(firestore);

            // Create in main collection
            batch.set(mainConversationRef, newConversation);
            // Create copy for trainer
            batch.set(doc(firestore, `users/${trainerUser.uid}/conversations`, conversationId), newConversation);
            // Create copy for athlete
            batch.set(doc(firestore, `users/${athleteProfile.id}/conversations`, conversationId), newConversation);

            await batch.commit();
        }

        router.push(`/trainer/chat?conversationId=${conversationId}`);

    } catch (e) {
        console.error(e);
        toast({
            title: "Błąd",
            description: "Nie udało się rozpocząć konwersacji.",
            variant: "destructive"
        })
    }
};

  const chartConfig = {
    volume: {
      label: "Objętość",
      color: "hsl(var(--primary))",
    },
  } satisfies import('@/components/ui/chart').ChartConfig;

  const isLoading = sessionsLoading || goalsLoading || upcomingWorkoutsLoading || profileLoading || exercisesLoading;

  if (isLoading && !athleteProfile) {
      return (
          <div className="container mx-auto p-4 md:p-8">
              <Skeleton className="h-8 w-48 mb-6" />
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                   {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
               </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                    <Skeleton className="h-80 w-full lg:col-span-3" />
                    <Skeleton className="h-80 w-full lg:col-span-2" />
                    <Skeleton className="h-64 w-full lg:col-span-5" />
                </div>
          </div>
      )
  }

  if (!athleteProfile) {
    return <div className="container mx-auto p-4 md:p-8 text-center">Nie znaleziono profilu sportowca.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Button onClick={() => router.back()} variant="ghost" className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Wróć do listy
      </Button>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="font-headline text-3xl font-bold">Panel Sportowca: {athleteProfile?.name}</h1>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleStartConversation}>
                <MessageSquare className="mr-2 h-4 w-4" /> Napisz Wiadomość
            </Button>
            {trainerUser && <AssignPlanDialog athlete={athleteProfile} trainerId={trainerUser.uid} />}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Treningi w tym miesiącu" value={totalWorkouts.toString()} icon={Dumbbell} description="+2 od zeszłego miesiąca" isLoading={isLoading} />
        <StatCard title="Całkowita objętość" value={`${(totalWeightLifted / 1000).toFixed(1)}t`} icon={Activity} description="Całkowity podniesiony ciężar" isLoading={isLoading} />
        <StatCard title="Seria treningowa" value="12 dni" icon={CalendarCheck} description="Trzymaj tak dalej!" isLoading={isLoading} />
        <StatCard title="Cele w toku" value={`${goals?.length || 0}`} icon={Target} description="Zobacz cele sportowca" isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Tygodniowa objętość</CardTitle>
            <CardDescription>Całkowity ciężar podniesiony każdego dnia w tym tygodniu.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart accessibilityLayer data={weeklyVolume}>
                <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}t`} />
                <Tooltip content={<ChartTooltipContent />} cursor={false} />
                <Bar dataKey="volume" fill="var(--color-volume)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Cele</CardTitle>
            <CardDescription>Aktualne cele fitness sportowca.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals?.slice(0, 3).map((goal) => (
              <div key={goal.id}>
                <div className="mb-1 flex justify-between">
                  <span className="text-sm font-medium">{goal.title}</span>
                  <span className="text-sm text-muted-foreground">{goal.current}{goal.unit} / {goal.target}{goal.unit}</span>
                </div>
                <Progress value={(goal.current / goal.target) * 100} />
              </div>
            ))}
             <Link href={`/goals?athleteId=${athleteId}`}>
                <div className="text-sm text-center text-primary hover:underline cursor-pointer pt-2">Zobacz wszystkie cele</div>
            </Link>
          </CardContent>
        </Card>

         <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="font-headline">Nadchodzący trening</CardTitle>
            {nextWorkout ? (
                <CardDescription>{format(nextWorkout.date.toDate(), "EEEE, d MMMM yyyy", { locale: pl })}</CardDescription>
              ) : (
                <CardDescription>Brak zaplanowanych treningów.</CardDescription>
              )
            }
          </CardHeader>
          <CardContent>
            {nextWorkout ? (
                <div className="space-y-3">
                  {nextWorkout.exercises.map((exercise, index) => (
                    <div key={index} className="flex items-center justify-between rounded-md bg-secondary p-3">
                      <span className="font-semibold">{exercise.name}</span>
                      <span className="text-muted-foreground">{exercise.sets} serie x {exercise.reps} powtórzeń</span>
                    </div>
                  ))}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-8">
                  <CalendarPlus className="mx-auto h-12 w-12 mb-4"/>
                  <p>Brak nadchodzących treningów dla tego sportowca.</p>
                </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
            <CardHeader>
                <CardTitle className="font-headline">Historia Treningów</CardTitle>
                <CardDescription>Zapis ukończonych treningów sportowca.</CardDescription>
            </CardHeader>
            <CardContent>
            <Accordion type="single" collapsible className="w-full">
                {sessionsLoading ? (
                    <p>Ładowanie historii...</p>
                ) : workoutHistory?.map((log) => {
                const totalVolume = log.exercises.reduce((acc, ex) => {
                    const exVolume = ex.sets.reduce((setAcc, set) => setAcc + set.reps * (set.weight || 0), 0);
                    return acc + exVolume;
                }, 0);

                return (
                    <AccordionItem value={log.id} key={log.id}>
                    <div className="flex items-center">
                        <AccordionTrigger className="hover:no-underline flex-grow">
                            <div className="flex w-full items-center justify-between pr-4">
                                <div className="text-left">
                                    <p className="font-semibold">{log.workoutName}</p>
                                    <p className="text-sm text-muted-foreground">{format(log.endTime.toDate(), 'd MMMM yyyy', { locale: pl })}</p>
                                </div>
                                <div className="hidden text-right md:block">
                                    <p className="font-semibold">{log.duration} min</p>
                                    <p className="text-sm text-muted-foreground">Czas trwania</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold">{totalVolume.toLocaleString()} kg</p>
                                    <p className="text-sm text-muted-foreground">Objętość</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                         <div className="text-right ml-4 pr-4">
                            <FeedbackDialog workout={log} athleteId={athleteId} />
                        </div>
                    </div>
                    <AccordionContent>
                         <div className="p-2 bg-secondary/30 rounded-md">
                            {log.feedback && (
                                <div className="mb-4 p-3 rounded-md bg-background border">
                                    <p className="font-semibold text-sm">Feedback od trenera:</p>
                                    <p className="text-muted-foreground text-sm italic">"{log.feedback}"</p>
                                </div>
                            )}
                            <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead className="w-[200px]">Ćwiczenie</TableHead>
                                <TableHead>Seria</TableHead>
                                <TableHead className="text-right">Wynik</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {log.exercises.map((ex, exIndex) => {
                                  const exerciseDetails = exercises?.find(e => e.id === ex.exerciseId);
                                  if (exerciseDetails?.type === 'duration') {
                                      return (
                                          <TableRow key={`${exIndex}-duration`}>
                                            <TableCell className="font-medium" rowSpan={1}>{exerciseDetails?.name || 'Nieznane'}</TableCell>
                                            <TableCell>1</TableCell>
                                            <TableCell className="text-right">{ex.duration} sek.</TableCell>
                                          </TableRow>
                                      );
                                  }
                                  return ex.sets.map((set, setIndex) => (
                                    <TableRow key={`${exIndex}-${setIndex}`}>
                                      {setIndex === 0 ? (
                                        <TableCell rowSpan={ex.sets.length} className="font-medium align-top">
                                          {exerciseDetails?.name || 'Nieznane'}
                                        </TableCell>
                                      ) : null}
                                      <TableCell>{setIndex + 1}</TableCell>
                                      <TableCell className="text-right">
                                         {set.reps} {exerciseDetails?.type === 'weight' ? `x ${set.weight || 0}kg` : 'powt.'}
                                      </TableCell>
                                    </TableRow>
                                  ));
                                })}
                            </TableBody>
                            </Table>
                        </div>
                    </AccordionContent>
                    </AccordionItem>
                );
                })}
            </Accordion>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
