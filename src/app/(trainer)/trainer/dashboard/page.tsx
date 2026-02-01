'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useCollection } from '@/lib/db-hooks';
import {
  Users,
  MessageSquare,
  Dumbbell,
  TrendingUp,
  Ruler,
  Check,
  AlertTriangle,
  Trophy,
  ClipboardCheck,
  Send,
  Loader2,
  CheckCircle,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';

// --- Interfaces ---

interface Athlete {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface Conversation {
  id: string;
  athleteName: string;
  athleteAvatarUrl?: string;
  lastMessage?: {
    text: string;
    createdAt: string;
  };
  unreadCount?: Record<string, number>;
}

interface BodyMeasurement {
  id: string;
  ownerId: string;
  date: string;
  weight: number;
  photoURLs?: string[];
  sharedWithTrainer: boolean;
}

interface WorkoutLog {
  id: string;
  athleteId: string;
  workoutName: string;
  endTime: string;
  duration: number;
}

interface WorkoutPlan {
  id: string;
  name: string;
  trainerId: string;
}

// Command Center specific interfaces
interface CommandCenterData {
  athletes: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    hasWorkedOutThisWeek: boolean;
  }[];
  missedWorkouts: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  }[];
  recentRecords: {
    id: string;
    athleteId: string;
    athleteName: string;
    exerciseName: string;
    type: string;
    value: number;
    reps?: number;
    achievedAt: string;
  }[];
  pendingCheckInAthletes: {
    checkInId: string;
    athleteId: string;
    athleteName: string;
    weekStartDate: string;
  }[];
  checkInStats: {
    pending: number;
    submitted: number;
    total: number;
  };
  summary: {
    totalAthletes: number;
    activeThisWeek: number;
    pendingCheckIns: number;
    newRecords: number;
  };
}

interface CheckIn {
  id: string;
  athleteId: string;
  athleteName: string;
  athleteAvatarUrl?: string;
  weekStartDate: string;
  status: 'pending' | 'submitted' | 'reviewed';
  submittedAt?: string;
  responses?: {
    trainingRating: number;
    physicalFeeling: number;
    dietRating: number;
    hadIssues: boolean;
    issuesDescription?: string;
    additionalNotes?: string;
  };
  trainerNotes?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// --- Components from Command Center ---

function SendCheckInDialog({ athletes, onSuccess }: { athletes: CommandCenterData['athletes']; onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === athletes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(athletes.map((a) => a.id));
    }
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) {
      toast({
        title: 'Błąd',
        description: 'Wybierz co najmniej jednego sportowca.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/check-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteIds: selectedIds }),
      });

      if (res.ok) {
        toast({
          title: 'Sukces',
          description: `Wysłano check-in do ${selectedIds.length} sportowców.`,
        });
        setOpen(false);
        setSelectedIds([]);
        onSuccess();
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się wysłać check-inów.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Send className="mr-2 h-4 w-4" />
          Wyślij Check-in
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Wyślij tygodniowy check-in</DialogTitle>
          <DialogDescription>
            Wybierz sportowców, do których chcesz wysłać check-in na ten tydzień.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="mb-4 flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">
              Wybrano: {selectedIds.length} / {athletes.length}
            </Label>
            <Button variant="link" size="sm" onClick={handleSelectAll}>
              {selectedIds.length === athletes.length ? 'Odznacz wszystkich' : 'Zaznacz wszystkich'}
            </Button>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {athletes.map((athlete) => (
              <div
                key={athlete.id}
                className="flex items-center space-x-3 rounded-md border p-3"
              >
                <Checkbox
                  id={`athlete-${athlete.id}`}
                  checked={selectedIds.includes(athlete.id)}
                  onCheckedChange={() => handleToggle(athlete.id)}
                />
                <Label
                  htmlFor={`athlete-${athlete.id}`}
                  className="flex-1 cursor-pointer"
                >
                  {athlete.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSending}>
            Anuluj
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Wyślij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CheckInReviewCard({ checkIn, onUpdate }: { checkIn: CheckIn; onUpdate: () => void }) {
  const { toast } = useToast();
  const [trainerNotes, setTrainerNotes] = useState(checkIn.trainerNotes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/check-ins/${checkIn.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerNotes, markAsReviewed: true }),
      });

      if (res.ok) {
        toast({ title: 'Sukces', description: 'Notatki zapisane.' });
        onUpdate();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać notatek.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-500';
    if (rating >= 5) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-4">
      {checkIn.responses ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Trening</p>
              <p className={`text-2xl font-bold ${getRatingColor(checkIn.responses.trainingRating)}`}>
                {checkIn.responses.trainingRating}/10
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Samopoczucie</p>
              <p className={`text-2xl font-bold ${getRatingColor(checkIn.responses.physicalFeeling)}`}>
                {checkIn.responses.physicalFeeling}/10
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Dieta</p>
              <p className={`text-2xl font-bold ${getRatingColor(checkIn.responses.dietRating)}`}>
                {checkIn.responses.dietRating}/10
              </p>
            </div>
          </div>

          {checkIn.responses.hadIssues && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">⚠️ Zgłoszono problemy:</p>
              <p className="text-sm text-red-700">
                {checkIn.responses.issuesDescription || 'Brak opisu'}
              </p>
            </div>
          )}

          {checkIn.responses.additionalNotes && (
            <div className="rounded-md border bg-muted p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Dodatkowe uwagi:</p>
              <p className="text-sm">{checkIn.responses.additionalNotes}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="trainerNotes">Notatki trenera:</Label>
            <Textarea
              id="trainerNotes"
              value={trainerNotes}
              onChange={(e) => setTrainerNotes(e.target.value)}
              placeholder="Dodaj swoje notatki..."
              rows={3}
            />
            <Button onClick={handleSaveNotes} disabled={isSaving} size="sm">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {checkIn.status === 'reviewed' ? 'Aktualizuj' : 'Zapisz i oznacz jako przejrzane'}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-center text-muted-foreground py-4">
          Oczekuje na wypełnienie przez sportowca
        </p>
      )}
    </div>
  );
}

// --- Main Page Component ---

export default function TrainerDashboardPage() {
  const { user } = useUser();

  // 1. Fetch Dashboard specific data
  // Fetch trainer's athletes - only when user is available
  const { data: athletes, isLoading: athletesLoading } = useCollection<Athlete>(
    user?.uid ? 'users' : null,
    { trainerId: user?.uid, role: 'athlete' }
  );

  // Fetch conversations - only when user is available
  const { data: conversations, isLoading: conversationsLoading } = useCollection<Conversation>(
    user?.uid ? 'conversations' : null,
    { trainerId: user?.uid },
    { sort: { updatedAt: -1 }, limit: 5 }
  );

  // Fetch recent workout logs from all athletes - only when we have athletes
  const athleteIds = athletes?.map((a) => a.id) || [];
  const { data: recentWorkouts, isLoading: workoutsLoading } = useCollection<WorkoutLog>(
    user?.uid && athleteIds.length > 0 ? 'workoutLogs' : null,
    { athleteId: { $in: athleteIds } },
    { sort: { endTime: -1 }, limit: 10 }
  );

  // Fetch workout plans - only when user is available
  const { data: workoutPlans, isLoading: plansLoading } = useCollection<WorkoutPlan>(
    user?.uid ? 'workoutPlans' : null,
    { trainerId: user?.uid }
  );

  // Fetch recent Shared Measurements - NEW
  const { data: recentMeasurements, isLoading: measurementsLoading } = useCollection<BodyMeasurement>(
    user?.uid ? 'bodyMeasurements' : null,
    { sharedWithTrainer: true },
    { sort: { date: -1 }, limit: 5 }
  );

  // 2. Fetch Command Center specific data
  const { data: ccData, error: ccError, isLoading: ccLoading } = useSWR<CommandCenterData>(
    user?.uid ? '/api/trainer/command-center' : null,
    fetcher
  );

  const { data: checkInsData, isLoading: checkInsLoading } = useSWR<{ checkIns: CheckIn[] }>(
    user?.uid ? '/api/check-ins?limit=20' : null,
    fetcher
  );

  const handleRefresh = () => {
    mutate('/api/trainer/command-center');
    mutate('/api/check-ins?limit=20');
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAthletes = athletes?.length || 0;
    const totalPlans = workoutPlans?.length || 0;
    const unreadMessages = conversations?.reduce((sum: number, conv: any) => {
      return sum + (conv.unreadCount?.[user?.uid || ''] || 0);
    }, 0) || 0;
    const recentWorkoutsCount = recentWorkouts?.filter((w: any) => {
      const workoutDate = new Date(w.endTime);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return workoutDate >= weekAgo;
    }).length || 0;

    return {
      totalAthletes,
      totalPlans,
      unreadMessages,
      recentWorkoutsCount,
    };
  }, [athletes, workoutPlans, conversations, recentWorkouts, user]);

  const isLoading = athletesLoading || conversationsLoading || workoutsLoading || plansLoading || measurementsLoading || ccLoading || checkInsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Skeleton className="mb-6 h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-headline text-3xl font-bold">Panel Trenera</h1>
          <p className="text-muted-foreground">Przegląd statusów i aktywności sportowców</p>
        </div>
        {ccData && ccData.athletes.length > 0 && (
          <SendCheckInDialog athletes={ccData.athletes} onSuccess={handleRefresh} />
        )}
      </div>

      {/* Unified Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sportowcy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAthletes}</div>
            <p className="text-xs text-muted-foreground">
              {ccData?.summary.activeThisWeek || 0} aktywnych w tym tygodniu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pominięte treningi</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ccData?.missedWorkouts.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              sportowców bez treningu (7 dni)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wiadomości</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unreadMessages}</div>
            <p className="text-xs text-muted-foreground">
              Nowych wiadomości
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tygodniowe Check-iny</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ccData?.checkInStats.submitted || 0}/{ccData?.checkInStats.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              wypełnionych
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Left Column: Alerts & Monitoring (Command Center Features) */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="alerts" className="space-y-4">
            <TabsList>
              <TabsTrigger value="alerts">
                Alerty
                {(ccData?.missedWorkouts.length || 0) > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {ccData?.missedWorkouts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="records">
                Rekordy
                {(ccData?.summary.newRecords || 0) > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {ccData?.summary.newRecords}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="checkins">
                Check-iny
                {(ccData?.checkInStats.pending || 0) > 0 && (
                  <Badge className="ml-2 bg-blue-500">{ccData?.checkInStats.pending}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Alerts Tab */}
            <TabsContent value="alerts">
              <Card>
                <CardHeader>
                  <CardTitle>Sportowcy wymagający uwagi</CardTitle>
                  <CardDescription>
                    Osoby które nie trenowały w ostatnim tygodniu
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ccData?.missedWorkouts && ccData.missedWorkouts.length > 0 ? (
                    <div className="space-y-3">
                      {ccData.missedWorkouts.map((athlete) => (
                        <div
                          key={athlete.id}
                          className="flex items-center justify-between rounded-lg border border-orange-200/5 bg-orange-500/5 p-4"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={athlete.avatarUrl} alt={athlete.name} />
                              <AvatarFallback>{athlete.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{athlete.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Brak treningu w ostatnim tygodniu
                              </p>
                            </div>
                          </div>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/trainer/my-athletes/${athlete.id}`}>Zobacz profil</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                      <p className="text-muted-foreground">
                        Wszyscy sportowcy trenowali w tym tygodniu!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Records Tab */}
            <TabsContent value="records">
              <Card>
                <CardHeader>
                  <CardTitle>Ostatnie rekordy osobiste</CardTitle>
                  <CardDescription>Pobite rekordy w ostatnich 7 dniach</CardDescription>
                </CardHeader>
                <CardContent>
                  {ccData?.recentRecords && ccData.recentRecords.length > 0 ? (
                    <div className="space-y-3">
                      {ccData.recentRecords.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between rounded-lg border bg-gradient-to-r from-yellow-50 to-orange-50 p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                              <Trophy className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                              <p className="font-medium">{record.athleteName}</p>
                              <p className="text-sm text-muted-foreground">
                                {record.exerciseName}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              {record.type === 'max_weight'
                                ? `${record.value} kg`
                                : record.type === 'max_reps'
                                  ? `${record.value} powt.`
                                  : `${record.value} sek.`}
                              {record.reps && record.type === 'max_weight' && (
                                <span className="text-sm font-normal text-muted-foreground">
                                  {' '}
                                  x {record.reps}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(record.achievedAt), 'd MMM', { locale: pl })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Brak nowych rekordów w tym tygodniu
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Check-ins Tab */}
            <TabsContent value="checkins">
              <Card>
                <CardHeader>
                  <CardTitle>Tygodniowe check-iny</CardTitle>
                  <CardDescription>
                    Przegląd wypełnionych raportów tygodniowych
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {checkInsData?.checkIns && checkInsData.checkIns.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                      {checkInsData.checkIns.map((checkIn) => (
                        <AccordionItem key={checkIn.id} value={checkIn.id}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={checkIn.athleteAvatarUrl} alt={checkIn.athleteName} />
                                  <AvatarFallback>
                                    {checkIn.athleteName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="text-left">
                                  <p className="font-medium">{checkIn.athleteName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Tydzień od{' '}
                                    {format(new Date(checkIn.weekStartDate), 'd MMM', {
                                      locale: pl,
                                    })}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant={
                                  checkIn.status === 'submitted'
                                    ? 'default'
                                    : checkIn.status === 'reviewed'
                                      ? 'secondary'
                                      : 'outline'
                                }
                                className={
                                  checkIn.status === 'submitted'
                                    ? 'bg-blue-500'
                                    : checkIn.status === 'reviewed'
                                      ? 'bg-green-500 text-white'
                                      : ''
                                }
                              >
                                {checkIn.status === 'pending' && (
                                  <>
                                    <Clock className="mr-1 h-3 w-3" />
                                    Oczekuje
                                  </>
                                )}
                                {checkIn.status === 'submitted' && (
                                  <>
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Wypełniony
                                  </>
                                )}
                                {checkIn.status === 'reviewed' && (
                                  <>
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Przejrzany
                                  </>
                                )}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4">
                            <CheckInReviewCard checkIn={checkIn} onUpdate={handleRefresh} />
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="text-center py-8">
                      <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Brak check-inów. Wyślij pierwszy check-in do swoich sportowców.
                      </p>
                      {ccData && ccData.athletes.length > 0 && (
                        <SendCheckInDialog athletes={ccData.athletes} onSuccess={handleRefresh} />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Recent Workout Activity (From original Dashboard) */}
          <Card>
            <CardHeader>
              <CardTitle>Ostatnie Aktywności</CardTitle>
              <CardDescription>Najnowsze treningi Twoich sportowców</CardDescription>
            </CardHeader>
            <CardContent>
              {recentWorkouts && recentWorkouts.length > 0 ? (
                <div className="space-y-4">
                  {recentWorkouts.slice(0, 5).map((workout: any) => {
                    const athlete = athletes?.find((a: any) => a.id === workout.athleteId);
                    return (
                      <div key={workout.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={athlete?.avatarUrl} alt={athlete?.name || 'Athlete'} />
                            <AvatarFallback>
                              {athlete?.name?.charAt(0) || 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{athlete?.name || 'Nieznany'}</p>
                            <p className="text-xs text-muted-foreground">{workout.workoutName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(workout.endTime).toLocaleDateString('pl-PL')}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(workout.duration / 60)} min
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Brak ostatnich aktywności
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Messages & Measurements */}
        <div className="space-y-6">
          {/* Unread Messages */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Wiadomości</CardTitle>
                  <CardDescription>Ostatnie konwersacje</CardDescription>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/trainer/chat">Zobacz wszystkie</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {conversations && conversations.length > 0 ? (
                <div className="space-y-4">
                  {conversations.map((conv: any) => {
                    const unreadCount = conv.unreadCount?.[user?.uid || ''] || 0;
                    return (
                      <Link
                        key={conv.id}
                        href={`/trainer/chat?conversationId=${conv.id}`}
                        className="flex items-center justify-between border-b pb-3 last:border-0 hover:bg-accent/50 rounded p-2 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={conv.athleteAvatarUrl} alt={conv.athleteName || 'Athlete'} />
                            <AvatarFallback>
                              {conv.athleteName?.charAt(0) || 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{conv.athleteName}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {conv.lastMessage?.text || 'Brak wiadomości'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {conv.lastMessage?.createdAt
                              ? new Date(conv.lastMessage.createdAt).toLocaleDateString('pl-PL')
                              : ''}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Brak konwersacji
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Measurements */}
          <Card>
            <CardHeader>
              <CardTitle>Ostatnie Pomiary</CardTitle>
              <CardDescription>Najnowsze pomiary udostępnione przez sportowców</CardDescription>
            </CardHeader>
            <CardContent>
              {recentMeasurements && recentMeasurements.length > 0 ? (
                <div className="space-y-4">
                  {recentMeasurements.map((measurement: any) => {
                    const athlete = athletes?.find((a: any) => a.id === measurement.ownerId);
                    return (
                      <div key={measurement.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={athlete?.avatarUrl} alt={athlete?.name || 'Athlete'} />
                            <AvatarFallback>
                              {athlete?.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{athlete?.name || 'Nieznany'}</p>
                            <p className="text-xs text-muted-foreground">Waga: {measurement.weight} kg</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {measurement.photoURLs && measurement.photoURLs.length > 0 && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Check className="h-3 w-3" /> Zdjęcia
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(measurement.date).toLocaleDateString('pl-PL')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Brak udostępnionych pomiarów
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
