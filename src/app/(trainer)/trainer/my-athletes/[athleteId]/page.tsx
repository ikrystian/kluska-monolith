'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  Activity,
  CalendarCheck,
  Dumbbell,
  Target,
  CalendarPlus,
  PlusCircle,
  Loader2,
  MessageSquare,
  Ruler,
  ClipboardList,
  CheckCircle,
  Clock
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
import { useUser, useCollection, useDoc, useUpdateDoc } from '@/lib/db-hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UserProfile, WorkoutLog, Exercise, TrainingPlan } from '@/lib/types';
import { useChat } from '@/components/chat/hooks/useChat';

interface Survey {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'closed';
  assignedAthleteIds: string[];
  questions: {
    id: string;
    text: string;
    type: 'open' | 'closed';
  }[];
}

interface SurveyResponse {
  id: string;
  surveyId: string;
  athleteId: string;
  submittedAt: string;
  answers: {
    questionId: string;
    answer: string;
  }[];
}


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

function AssignPlanDialog({ athlete, trainerId }: { athlete: any, trainerId: string }) {
  const { toast } = useToast();
  const { updateDoc } = useUpdateDoc();
  const [open, setOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const { data: trainerPlans, isLoading, refetch } = useCollection(
    'workoutPlans',
    { trainerId }
  );

  const [assignedPlanIds, setAssignedPlanIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (trainerPlans) {
      const currentlyAssigned = trainerPlans
        .filter((plan: any) => plan.assignedAthleteIds?.includes(athlete.id))
        .map((plan: any) => plan.id);
      setAssignedPlanIds(currentlyAssigned);
    }
  }, [trainerPlans, athlete.id]);

  const handleAssign = async () => {
    if (!trainerPlans) return;
    setIsAssigning(true);

    try {
      const promises = trainerPlans.map((plan: any) => {
        let newAssignedIds = [...(plan.assignedAthleteIds || [])];

        if (assignedPlanIds.includes(plan.id) && !plan.assignedAthleteIds?.includes(athlete.id)) {
          // Assign
          newAssignedIds.push(athlete.id);
        } else if (!assignedPlanIds.includes(plan.id) && plan.assignedAthleteIds?.includes(athlete.id)) {
          // Unassign
          newAssignedIds = newAssignedIds.filter(id => id !== athlete.id);
        } else {
          return Promise.resolve(); // No change for this plan
        }

        return updateDoc('workoutPlans', plan.id, { assignedAthleteIds: newAssignedIds });
      });

      await Promise.all(promises);
      toast({
        title: "Plany zaktualizowane!",
        description: `Przypisania planów dla ${athlete.name} zostały zaktualizowane.`,
      });
      refetch();
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
    if (checked) {
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
          {trainerPlans && trainerPlans.map((plan: any) => (
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
            {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FeedbackDialog({ workout, onUpdate }: { workout: any, onUpdate: () => void }) {
  const { toast } = useToast();
  const { updateDoc } = useUpdateDoc();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState(workout.feedback || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await updateDoc('workoutLogs', workout.id, { feedback });
      toast({ title: 'Sukces', description: 'Feedback został zapisany.' });
      onUpdate();
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać feedbacku.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
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
            Data: {workout.endTime ? format(new Date(workout.endTime), 'd MMMM yyyy', { locale: pl }) : 'Brak daty'}
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
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


export default function AthleteProfilePage() {
  const { user: trainerUser } = useUser();
  const router = useRouter();
  const params = useParams();
  const athleteId = params.athleteId as string;
  const { toast } = useToast();

  // Fetch athlete profile
  const { data: athleteProfile, isLoading: profileLoading } = useDoc<UserProfile>('users', athleteId);

  // Fetch workout history
  const { data: workoutHistory, isLoading: sessionsLoading, refetch: refetchWorkouts } = useCollection<WorkoutLog>(
    athleteId ? 'workoutLogs' : null,
    { athleteId },
    { sort: { endTime: -1 }, limit: 20 }
  );

  // Fetch goals
  const { data: goals, isLoading: goalsLoading } = useCollection(
    athleteId ? 'goals' : null,
    { ownerId: athleteId }
  );

  // Fetch exercises
  const { data: exercises, isLoading: exercisesLoading } = useCollection<Exercise>('exercises');

  // Fetch body measurements
  const { data: bodyMeasurements, isLoading: measurementsLoading } = useCollection(
    athleteId ? 'bodyMeasurements' : null,
    { ownerId: athleteId, sharedWithTrainer: true },
    { sort: { date: -1 }, limit: 5 }
  );

  // Fetch planned workouts
  const { data: plannedWorkouts, isLoading: plannedLoading } = useCollection(
    athleteId ? 'plannedWorkouts' : null,
    { athleteId },
    { sort: { date: 1 }, limit: 5 }
  );

  // Fetch assigned surveys
  const { data: surveys, isLoading: surveysLoading } = useCollection<Survey>(
    athleteId ? 'surveys' : null,
    { assignedAthleteIds: athleteId }
  );

  // Fetch survey responses
  const { data: surveyResponses, isLoading: responsesLoading } = useCollection<SurveyResponse>(
    athleteId ? 'surveyResponses' : null,
    { athleteId }
  );

  const nextWorkout = plannedWorkouts?.[0];

  // Calculate statistics
  const stats = useMemo(() => {
    const totalWorkouts = workoutHistory?.length || 0;
    const totalWeightLifted = workoutHistory?.reduce((acc: number, log: any) => {
      if (!log.endTime) return acc;
      return acc + (log.exercises?.reduce((exAcc: number, ex: any) =>
        exAcc + (ex.sets?.reduce((setAcc: number, set: any) => setAcc + set.reps * (set.weight || 0), 0) || 0)
        , 0) || 0)
    }, 0) || 0;

    const weeklyVolume = workoutHistory?.reduce((acc: any[], log: any) => {
      if (!log.endTime) return acc;
      const day = format(new Date(log.endTime), 'eee', { locale: pl });
      const volume = log.exercises?.reduce((exAcc: number, ex: any) =>
        exAcc + ex.sets?.reduce((setAcc: number, s: any) => setAcc + s.reps * (s.weight || 0), 0), 0) || 0;
      const existing = acc.find(d => d.day === day);
      if (existing) {
        existing.volume += volume;
      } else {
        acc.push({ day, volume });
      }
      return acc;
    }, [] as { day: string; volume: number }[]) || [];

    return {
      totalWorkouts,
      totalWeightLifted,
      weeklyVolume,
    };
  }, [workoutHistory]);

  const { createConversation, conversations } = useChat();

  const handleStartConversation = async () => {
    if (!trainerUser || !athleteProfile) return;

    const conversationId = [trainerUser.uid, athleteProfile.id].sort().join('_');
    const existingConversation = conversations?.find(c => c.conversationId === conversationId);

    if (!existingConversation) {
      try {
        // Create new conversation
        const trainerProfileResponse = await fetch(`/api/db/users/${trainerUser.uid}`);
        const trainerProfileData = await trainerProfileResponse.json();
        const trainerProfile = trainerProfileData.data;

        await createConversation({
          conversationId: conversationId,
          participants: [trainerUser.uid, athleteProfile.id],
          trainerId: trainerUser.uid,
          athleteId: athleteProfile.id,
          trainerName: trainerProfile.name,
          athleteName: athleteProfile.name,
          lastMessage: null,
          updatedAt: new Date(),
          unreadCount: {
            [trainerUser.uid]: 0,
            [athleteProfile.id]: 0,
          },
        });
      } catch (e) {
        console.error(e);
        toast({
          title: "Błąd",
          description: "Nie udało się rozpocząć konwersacji.",
          variant: "destructive"
        });
        return;
      }
    }

    router.push(`/trainer/chat?conversationId=${conversationId}`);
  };

  const chartConfig = {
    volume: {
      label: "Objętość",
      color: "hsl(var(--primary))",
    },
  } satisfies import('@/components/ui/chart').ChartConfig;

  const isLoading = sessionsLoading || goalsLoading || plannedLoading || profileLoading || exercisesLoading || measurementsLoading;

  if (isLoading && !athleteProfile) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
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
        <StatCard title="Treningi w tym miesiącu" value={stats.totalWorkouts.toString()} icon={Dumbbell} description="Ukończone treningi" isLoading={isLoading} />
        <StatCard title="Całkowita objętość" value={`${(stats.totalWeightLifted / 1000).toFixed(1)}t`} icon={Activity} description="Całkowity podniesiony ciężar" isLoading={isLoading} />
        <StatCard title="Pomiary ciała" value={bodyMeasurements?.length.toString() || '0'} icon={Ruler} description="Udostępnionych pomiarów" isLoading={isLoading} />
        <StatCard title="Cele w toku" value={`${goals?.length || 0}`} icon={Target} description="Aktywne cele" isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Tygodniowa objętość</CardTitle>
            <CardDescription>Całkowity ciężar podniesiony każdego dnia w tym tygodniu.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart accessibilityLayer data={stats.weeklyVolume}>
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
            {goals && goals.length > 0 ? (
              <>
                {goals.slice(0, 3).map((goal: any) => (
                  <div key={goal.id}>
                    <div className="mb-1 flex justify-between">
                      <span className="text-sm font-medium">{goal.title}</span>
                      <span className="text-sm text-muted-foreground">{goal.current}{goal.unit} / {goal.target}{goal.unit}</span>
                    </div>
                    <Progress value={(goal.current / goal.target) * 100} />
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Brak celów</p>
            )}
          </CardContent>
        </Card>

        {/* Surveys Section - New Addition */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="font-headline">Ankiety</CardTitle>
            <CardDescription>Ankiety przypisane do sportowca i ich status.</CardDescription>
          </CardHeader>
          <CardContent>
            {surveysLoading || responsesLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : surveys && surveys.length > 0 ? (
              <Accordion type="single" collapsible className="w-full space-y-2">
                {surveys.map((survey) => {
                  const response = surveyResponses?.find(r => r.surveyId === survey.id);
                  const isCompleted = !!response;

                  return (
                    <AccordionItem key={survey.id} value={survey.id} className="border rounded-lg px-2">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-secondary text-muted-foreground'}`}>
                              <ClipboardList className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium">{survey.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {isCompleted
                                  ? `Wypełniona: ${format(new Date(response.submittedAt), 'd MMM yyyy', { locale: pl })}`
                                  : 'Oczekuje na wypełnienie'
                                }
                              </p>
                            </div>
                          </div>
                          <div>
                            {isCompleted ? (
                              <Badge className="bg-green-500">Wypełniona</Badge>
                            ) : (
                              <Badge variant="secondary">Niewypełniona</Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 px-2">
                        {isCompleted ? (
                          <div className="space-y-4">
                            {survey.questions?.map((question, idx) => {
                              const answer = response.answers.find(a => a.questionId === question.id)?.answer || '-';
                              return (
                                <div key={question.id} className="border-l-2 border-primary/20 pl-4">
                                  <p className="text-sm font-medium text-muted-foreground mb-1">
                                    {idx + 1}. {question.text}
                                  </p>
                                  <p className="text-sm">{answer}</p>
                                </div>
                              );
                            })}
                            <div className="pt-2">
                              <Button variant="outline" size="sm" asChild className="w-full">
                                <Link href={`/trainer/surveys/${survey.id}`}>
                                  Pełne szczegóły ankiety
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Ankieta jeszcze nie została wypełniona przez sportowca.
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <ClipboardList className="mx-auto h-12 w-12 mb-4" />
                <p>Brak przypisanych ankiet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="font-headline">Pomiary ciała</CardTitle>
            <CardDescription>Ostatnie pomiary udostępnione przez sportowca</CardDescription>
          </CardHeader>
          <CardContent>
            {bodyMeasurements && bodyMeasurements.length > 0 ? (
              <div className="space-y-3">
                {bodyMeasurements.map((measurement: any) => (
                  <div key={measurement.id} className="flex flex-col gap-2 rounded-md bg-secondary p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{format(new Date(measurement.date), "d MMMM yyyy", { locale: pl })}</p>
                        <p className="text-sm text-muted-foreground">Waga: {measurement.weight} kg</p>
                      </div>
                      <div className="flex gap-2">
                        {measurement.circumferences?.biceps && (
                          <Badge variant="outline">Biceps: {measurement.circumferences.biceps} cm</Badge>
                        )}
                        {measurement.circumferences?.chest && (
                          <Badge variant="outline">Klatka: {measurement.circumferences.chest} cm</Badge>
                        )}
                      </div>
                    </div>
                    {measurement.photoURLs && measurement.photoURLs.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {measurement.photoURLs.map((url: string, idx: number) => (
                          <div key={idx} className="relative h-24 w-24 flex-shrink-0 rounded-md overflow-hidden border">
                            <img src={url} alt={`Pomiar ${idx + 1}`} className="h-full w-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Ruler className="mx-auto h-12 w-12 mb-4" />
                <p>Brak udostępnionych pomiarów ciała.</p>
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
              ) : workoutHistory && workoutHistory.length > 0 ? (
                workoutHistory.map((log: WorkoutLog) => {
                  const totalVolume = log.exercises?.reduce((acc, ex) => {
                    if (ex.exercise?.type !== 'weight') return acc;
                    const exVolume = ex.sets?.reduce((setAcc, set) => setAcc + (set.reps || 0) * (set.weight || 0), 0) || 0;
                    return acc + exVolume;
                  }, 0) || 0;

                  return (
                    <AccordionItem value={log.id} key={log.id}>
                      <div className="flex items-center">
                        <AccordionTrigger className="hover:no-underline flex-grow">
                          <div className="flex w-full items-center justify-between pr-4">
                            <div className="text-left">
                              <p className="font-semibold">{log.workoutName}</p>
                              <p className="text-sm text-muted-foreground">
                                {log.endTime ? format(
                                  // @ts-ignore - Handle Timestamp or Date
                                  log.endTime.toDate ? log.endTime.toDate() : new Date(log.endTime),
                                  'd MMMM yyyy',
                                  { locale: pl }
                                ) : 'Brak daty'}
                              </p>
                            </div>
                            <div className="hidden text-right md:block">
                              <p className="font-semibold">{log.duration ? Math.round(log.duration) : 0} min</p>
                              <p className="text-sm text-muted-foreground">Czas trwania</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{totalVolume.toLocaleString()} kg</p>
                              <p className="text-sm text-muted-foreground">Objętość</p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <div className="text-right ml-4 pr-4">
                          <FeedbackDialog workout={log} onUpdate={refetchWorkouts} />
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
                              {log.exercises?.map((ex: any, exIndex) => {
                                // Support both old structure (exerciseId lookup) and new structure (nested exercise object)
                                const exerciseName = ex.exercise?.name || exercises?.find(e => e.id === ex.exerciseId)?.name || 'Nieznane';
                                const exerciseType = ex.exercise?.type || exercises?.find(e => e.id === ex.exerciseId)?.type;

                                if (exerciseType === 'duration') {
                                  return (
                                    <TableRow key={`${exIndex}-duration`}>
                                      <TableCell className="font-medium" rowSpan={1}>{exerciseName}</TableCell>
                                      <TableCell>1</TableCell>
                                      <TableCell className="text-right">{ex.sets[0]?.duration || 0} sek.</TableCell>
                                    </TableRow>
                                  );
                                }
                                return ex.sets?.map((set: any, setIndex: number) => (
                                  <TableRow key={`${exIndex}-${setIndex}`}>
                                    {setIndex === 0 ? (
                                      <TableCell rowSpan={ex.sets.length} className="font-medium align-top">
                                        {exerciseName}
                                      </TableCell>
                                    ) : null}
                                    <TableCell>{setIndex + 1}</TableCell>
                                    <TableCell className="text-right">
                                      {set.reps} {exerciseType === 'weight' || !exerciseType ? `x ${set.weight || 0}kg` : 'powt.'}
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
                })
              ) : (
                <p className="text-center text-muted-foreground py-8">Brak historii treningów</p>
              )}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
