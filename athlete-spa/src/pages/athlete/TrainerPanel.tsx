import { useState } from 'react';
import { AthletesSection, InquiriesSection, PanelStatsGrid, SchedulePreview } from '@/components/trainer-panel/PanelSections';
import {
  buildAthleteRows,
  buildStats,
  logWindowStart,
  upcomingSessions,
  weekStartIso,
  type PanelAthlete,
  type PanelLog,
  type PanelSession,
} from '@/components/trainer-panel/panel-data';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api-client';
import { useCollection, useUpdateDoc, useUser } from '@/lib/db-hooks';
import { haptic } from '@/lib/haptics';
import type { TrainerRequest } from '@/lib/types';

interface PanelPlan {
  id: string;
  assignedAthleteIds: string[];
}

/** Panel trenera: przegląd podopiecznych, harmonogram, zapytania i statystyki z prawdziwych danych. */
export default function TrainerPanelPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { updateDoc } = useUpdateDoc();
  const [busyId, setBusyId] = useState<string | null>(null);

  // Daty wyliczone od północy/poniedziałku: klucze zapytań SWR zostają takie same w ciągu dnia.
  const now = new Date();

  const {
    data: athletes,
    isLoading: athletesLoading,
    refetch: refetchAthletes,
  } = useCollection<PanelAthlete>(user ? 'users' : null, { role: 'athlete', trainerId: user?.uid });

  const athleteIds = (athletes ?? []).map(athlete => athlete.id);
  const {
    data: logs,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useCollection<PanelLog>(
    user && athleteIds.length > 0 ? 'workoutLogs' : null,
    { athleteId: { $in: athleteIds }, endTime: { $gte: logWindowStart(now) } },
    { sort: { endTime: -1 }, omit: ['exercises'], limit: 1000 }
  );

  const {
    data: requests,
    isLoading: requestsLoading,
    refetch: refetchRequests,
  } = useCollection<TrainerRequest>(user ? 'trainerRequests' : null, { trainerId: user?.uid }, { sort: { createdAt: -1 } });

  const { data: sessions, isLoading: sessionsLoading } = useCollection<PanelSession>(
    user ? 'trainingSessions' : null,
    { trainerId: user?.uid, date: { $gte: weekStartIso(now) } },
    { sort: { date: 1 } }
  );

  const { data: plans, isLoading: plansLoading } = useCollection<PanelPlan>(
    user ? 'workoutPlans' : null,
    { trainerId: user?.uid },
    { omit: ['stages'] }
  );

  const loading = athletesLoading || logsLoading || requestsLoading || sessionsLoading || plansLoading;
  if (loading) return <PanelSkeleton />;

  const pending = (requests ?? []).filter(request => request.status === 'pending');
  const sessionList = sessions ?? [];
  const logList = logs ?? [];
  const rows = buildAthleteRows(athletes ?? [], logList, sessionList, now);
  const stats = buildStats(
    rows,
    pending.length,
    sessionList,
    logList,
    (plans ?? []).filter(plan => plan.assignedAthleteIds?.length > 0).length,
    now
  );

  const refetchAll = () => {
    refetchAthletes();
    refetchLogs();
    refetchRequests();
  };

  // Przypisanie to PATCH na dokumencie sportowca (serwer pozwala trenerowi tylko na nieprzypisanych),
  // a potem zmiana statusu zapytania, tak samo jak w panelu webowym.
  const accept = async (request: TrainerRequest) => {
    if (!user) return;
    setBusyId(request.id);
    try {
      const response = await apiFetch(`/api/db/users/${request.athleteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerId: user.uid }),
      });
      if (!response.ok) {
        throw new Error(
          response.status === 403 || response.status === 404
            ? 'Ten sportowiec ma już innego trenera albo konto nie istnieje.'
            : 'Nie udało się przypisać sportowca.'
        );
      }
      await updateDoc('trainerRequests', request.id, { status: 'accepted' });
      haptic('success');
      toast({ title: 'Sportowiec przyjęty', description: `${request.athleteName} jest teraz na Twojej liście.` });
      refetchAll();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się przyjąć zapytania.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (request: TrainerRequest) => {
    setBusyId(request.id);
    try {
      await updateDoc('trainerRequests', request.id, { status: 'rejected' });
      refetchRequests();
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się odrzucić zapytania.', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page space-y-6 pb-24">
      <header>
        <p className="text-xs font-semibold text-primary">Dla trenera</p>
        <h1 className="mt-1 font-display text-3xl font-bold uppercase leading-tight">Panel trenera</h1>
        <p className="mt-1 text-sm text-muted-foreground">Podopieczni, harmonogram i zapytania w jednym miejscu.</p>
      </header>

      <PanelStatsGrid stats={stats} />
      <InquiriesSection requests={pending} busyId={busyId} onAccept={accept} onReject={reject} />
      <SchedulePreview sessions={upcomingSessions(sessionList, now)} />
      <AthletesSection rows={rows} />
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="page space-y-6">
      <Skeleton className="h-16 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}
