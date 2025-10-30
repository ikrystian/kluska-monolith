'use client';

import {
  Activity,
  CalendarCheck,
  Dumbbell,
  Target,
  CalendarPlus,
  Check,
  X,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { collection, query, orderBy, limit, where, doc, setDoc, updateDoc } from 'firebase/firestore';
import type { Goal, WorkoutLog, PlannedWorkout, UserProfile, TrainerRequest } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


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

function TrainerDashboard({ user }: { user: UserProfile }) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const requestsQuery = useMemoFirebase(
        () => user ? query(
            collection(firestore, 'users', user.id, 'trainerRequests'),
            where('status', '==', 'pending')
        ) : null,
        [user, firestore]
    );

    const { data: requests, isLoading } = useCollection<TrainerRequest>(requestsQuery);

    const handleRequest = async (request: TrainerRequest, status: 'accepted' | 'rejected') => {
        if (!user) return;
        
        const requestRef = doc(firestore, 'users', user.id, 'trainerRequests', request.id);
        
        setDoc(requestRef, { status }, { merge: true })
        .then(async () => {
            if (status === 'accepted') {
                // Add to trainer's list of athletes
                const athleteInTrainerSubcollectionRef = doc(firestore, `trainers/${user.id}/athletes`, request.athleteId);
                const athleteProfileInSubcollection = {
                    id: request.athleteId,
                    name: request.athleteName,
                    email: '',
                    role: 'athlete',
                    trainerId: user.id,
                };
                await setDoc(athleteInTrainerSubcollectionRef, athleteProfileInSubcollection, { merge: true });

                // ALSO: Update the athlete's main user profile to include trainerId
                const athleteMainProfileRef = doc(firestore, 'users', request.athleteId);
                await updateDoc(athleteMainProfileRef, { trainerId: user.id });
            }
            toast({
                title: 'Zapytanie zaktualizowane',
                description: `Zapytanie od ${request.athleteName} zostało ${status === 'accepted' ? 'zaakceptowane' : 'odrzucone'}.`
            });
        })
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: requestRef.path,
                operation: 'update',
                requestResourceData: { status },
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    };

    return (
        <Card className="lg:col-span-5">
            <CardHeader>
                <CardTitle className="font-headline">Zapytania o Współpracę</CardTitle>
                <CardDescription>Nowi sportowcy, którzy chcą z Tobą trenować.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && <Skeleton className="h-24 w-full" />}
                {!isLoading && requests && requests.length > 0 ? (
                    <div className="space-y-4">
                        {requests.map(req => (
                            <div key={req.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                                <div className="flex items-center gap-4">
                                     <Avatar>
                                        <AvatarFallback>{req.athleteName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{req.athleteName}</p>
                                        <p className="text-sm text-muted-foreground">Chce rozpocząć współpracę</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleRequest(req, 'accepted')} className="bg-green-600 hover:bg-green-700">
                                        <Check className="mr-2 h-4 w-4" /> Akceptuj
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleRequest(req, 'rejected')}>
                                        <X className="mr-2 h-4 w-4" /> Odrzuć
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                     !isLoading && <p className="text-center text-muted-foreground p-8">Brak nowych zapytań.</p>
                )}
            </CardContent>
        </Card>
    )
}

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const sessionsRef = useMemoFirebase(() => 
    user ? collection(firestore, `users/${user.uid}/workoutSessions`) : null,
    [user, firestore]
  );
  const goalsRef = useMemoFirebase(() =>
    user ? collection(firestore, `users/${user.uid}/goals`) : null,
    [user, firestore]
  );

  const upcomingWorkoutQuery = useMemoFirebase(() => 
    user ? query(
      collection(firestore, `users/${user.uid}/plannedWorkouts`), 
      orderBy('date', 'asc'), 
      limit(1)
    ) : null,
    [user, firestore]
  );

  const { data: workoutHistory, isLoading: sessionsLoading } = useCollection<WorkoutLog>(sessionsRef);
  const { data: goals, isLoading: goalsLoading } = useCollection<Goal>(goalsRef);
  const { data: upcomingWorkouts, isLoading: upcomingWorkoutsLoading } = useCollection<PlannedWorkout>(upcomingWorkoutQuery);

  const nextWorkout = upcomingWorkouts?.[0];

  const totalWorkouts = workoutHistory?.length || 0;
  const totalWeightLifted = workoutHistory?.reduce((acc, log) => 
    acc + (log.exercises?.reduce((exAcc, ex) => 
      exAcc + (ex.sets?.reduce((setAcc, set) => setAcc + set.reps * set.weight, 0) || 0)
    , 0) || 0)
  , 0) || 0;

  const weeklyVolume = workoutHistory?.reduce((acc, log) => {
    if (!log.endTime) return acc;
    const day = format(log.endTime.toDate(), 'eee', { locale: pl });
    const volume = log.exercises.reduce((exAcc, ex) => exAcc + ex.sets.reduce((setAcc, s) => setAcc + s.reps * s.weight, 0), 0);
    const existing = acc.find(d => d.day === day);
    if (existing) {
      existing.volume += volume;
    } else {
      acc.push({ day, volume });
    }
    return acc;
  }, [] as { day: string; volume: number }[]) || [];

  const chartConfig = {
    volume: {
      label: "Objętość",
      color: "hsl(var(--primary))",
    },
  } satisfies import('@/components/ui/chart').ChartConfig;
  
  const isLoading = sessionsLoading || goalsLoading || upcomingWorkoutsLoading || profileLoading;
  const isTrainer = userProfile?.role === 'trainer';

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="mb-6 font-headline text-3xl font-bold">Witaj ponownie, {userProfile?.name || 'użytkowniku'}!</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Treningi w tym miesiącu" value={sessionsLoading ? "..." : totalWorkouts.toString()} icon={Dumbbell} description="+2 od zeszłego miesiąca" isLoading={sessionsLoading} />
        <StatCard title="Całkowita objętość" value={sessionsLoading ? "..." : `${(totalWeightLifted / 1000).toFixed(1)}t`} icon={Activity} description="Całkowity podniesiony ciężar" isLoading={sessionsLoading} />
        <StatCard title="Seria treningowa" value="12 dni" icon={CalendarCheck} description="Trzymaj tak dalej!" isLoading={sessionsLoading} />
        <StatCard title="Cele w toku" value={goalsLoading ? "..." : `${goals?.length || 0}`} icon={Target} description="Zobacz swoje cele" isLoading={goalsLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {isTrainer && userProfile && <TrainerDashboard user={userProfile} />}
        
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Tygodniowa objętość</CardTitle>
            <CardDescription>Całkowity ciężar podniesiony każdego dnia w tym tygodniu.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {sessionsLoading ? <Skeleton className="h-[200px] w-full" /> : (
              <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                <BarChart accessibilityLayer data={weeklyVolume}>
                  <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}t`} />
                  <Tooltip content={<ChartTooltipContent />} cursor={false} />
                  <Bar dataKey="volume" fill="var(--color-volume)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Cele</CardTitle>
            <CardDescription>Twoje aktualne cele fitness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {goalsLoading ? Array.from({length: 3}).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
            )) : goals?.slice(0, 3).map((goal) => (
              <div key={goal.id}>
                <div className="mb-1 flex justify-between">
                  <span className="text-sm font-medium">{goal.title}</span>
                  <span className="text-sm text-muted-foreground">{goal.current}{goal.unit} / {goal.target}{goal.unit}</span>
                </div>
                <Progress value={(goal.current / goal.target) * 100} />
              </div>
            ))}
             <div className="text-sm text-center text-primary hover:underline cursor-pointer pt-2">Zobacz wszystkie cele</div>
          </CardContent>
        </Card>

         <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="font-headline">Nadchodzący trening</CardTitle>
            {isLoading ? <Skeleton className="h-5 w-48"/> :
              nextWorkout ? (
                <CardDescription>{format(nextWorkout.date.toDate(), "EEEE, d MMMM yyyy", { locale: pl })}</CardDescription>
              ) : (
                <CardDescription>Brak zaplanowanych treningów. Czas coś zaplanować!</CardDescription>
              )
            }
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
            ) : nextWorkout ? (
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
                  <p>Wygląda na to, że nie masz żadnych nadchodzących treningów.</p>
                  <Button asChild variant="link" className="mt-2">
                    <Link href="/plan">Zaplanuj trening z AI &rarr;</Link>
                  </Button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
