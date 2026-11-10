'use client';

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { History as HistoryIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/section';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useUser } from '@/lib/db-hooks';
import { apiFetch } from '@/lib/api-client';
import type { WorkoutLog, RunningSession, StravaActivity } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from '@/components/motion';
import { formatKm, fromSession, fromStrava } from '@/components/running/running-format';
import { HistorySummary } from '@/components/history/HistorySummary';
import { HistoryRow } from '@/components/history/HistoryRow';
import {
  groupByMonth,
  runItem,
  totalsOf,
  workoutItem,
  type HistoryFilter,
  type HistoryItem,
  type WorkoutHistoryItem,
} from '@/components/history/history-model';

const PAGE_SIZE = 20;

const FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: 'all', label: 'Wszystko' },
  { value: 'workout', label: 'Siłownia' },
  { value: 'run', label: 'Biegi' },
];

const EMPTY_COPY: Record<HistoryFilter, { title: string; description: string }> = {
  all: {
    title: 'Jeszcze pusto',
    description: 'Ukończone treningi i biegi pojawią się tu w jednej osi czasu.',
  },
  workout: {
    title: 'Brak treningów siłowych',
    description: 'Zakończ pierwszy trening, a zobaczysz go na liście.',
  },
  run: {
    title: 'Brak biegów',
    description: 'Biegi zapisane w aplikacji i zaimportowane ze Stravy trafią tutaj.',
  },
};

export default function HistoryPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [editMode, setEditMode] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [pendingDelete, setPendingDelete] = useState<WorkoutHistoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Hidden right after a confirmed delete so the row leaves before the refetch lands.
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(new Set());

  // Limit to 50 records per source to prevent loading too much data at once.
  const { data: workoutLogs, isLoading, refetch } = useCollection<WorkoutLog>(
    user?.uid ? 'workoutLogs' : null,
    user?.uid ? { athleteId: user.uid } : undefined,
    { sort: { endTime: -1 }, limit: 50 }
  );

  // Running sessions tracked in-app, plus activities imported from Strava —
  // both show up in the same history feed as the strength workout logs.
  const { data: runningSessions, isLoading: runningLoading } = useCollection<RunningSession>(
    user?.uid ? 'runningSessions' : null,
    user?.uid ? { ownerId: user.uid } : undefined,
    { sort: { date: -1 }, limit: 50 }
  );
  const { data: stravaActivities, isLoading: stravaLoading } = useCollection<StravaActivity>(
    user?.uid ? 'stravaActivities' : null,
    user?.uid ? { ownerId: user.uid } : undefined,
    { sort: { date: -1 }, limit: 50 }
  );

  const isHistoryLoading = isLoading || runningLoading || stravaLoading;

  const allItems = useMemo(() => {
    const items: HistoryItem[] = [];
    workoutLogs?.forEach(log => {
      if (log.status === 'in-progress' || removedIds.has(log.id)) return;
      items.push(workoutItem(log));
    });
    runningSessions?.forEach(session => items.push(runItem(fromSession(session))));
    stravaActivities?.forEach(activity => items.push(runItem(fromStrava(activity))));
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [workoutLogs, runningSessions, stravaActivities, removedIds]);

  const filtered = useMemo(
    () => (filter === 'all' ? allItems : allItems.filter(item => item.kind === filter)),
    [allItems, filter]
  );

  const visible = filtered.slice(0, limit);
  const groups = useMemo(() => groupByMonth(visible), [visible]);

  // Month totals come from every loaded item, so a month cut off by paging still shows its full sum.
  const monthTotals = useMemo(() => {
    const byMonth = new Map<string, ReturnType<typeof totalsOf>>();
    for (const group of groupByMonth(filtered)) byMonth.set(group.key, totalsOf(group.items));
    return byMonth;
  }, [filtered]);

  const canEdit = filtered.some(item => item.kind === 'workout');
  const editing = editMode && canEdit;

  const handleDelete = async (target: WorkoutHistoryItem) => {
    if (!user) return;
    setDeletingId(target.id);

    try {
      const response = await apiFetch(`/api/db/workoutLogs/${target.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to delete workout log');

      haptic('impact');
      setRemovedIds(prev => new Set(prev).add(target.id));
      toast({
        title: 'Trening usunięty',
        description: 'Wybrana sesja treningowa została pomyślnie usunięta.',
        variant: 'destructive',
      });
      refetch();
    } catch (error) {
      console.error('Error deleting workout log:', error);
      haptic('warning');
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć treningu.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const selectFilter = (next: HistoryFilter) => {
    setFilter(next);
    setLimit(PAGE_SIZE);
  };

  return (
    <div className="page space-y-4">
      <HistorySummary items={allItems} isLoading={isHistoryLoading} />

      <div className="flex items-center gap-2">
        <div className="no-scrollbar -ml-0.5 flex min-w-0 flex-1 gap-1.5 overflow-x-auto pl-0.5" role="tablist" aria-label="Rodzaj aktywności">
          {FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => selectFilter(f.value)}
              className={cn(
                'h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors',
                filter === f.value ? 'bg-foreground text-background' : 'bg-card text-muted-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {canEdit && !isHistoryLoading && (
          <button
            type="button"
            onClick={() => setEditMode(value => !value)}
            className={cn(
              '-my-2 shrink-0 py-2 pl-2 text-sm font-semibold transition-colors',
              editing ? 'text-volt' : 'text-muted-foreground active:text-foreground'
            )}
          >
            {editing ? 'Gotowe' : 'Edytuj'}
          </button>
        )}
      </div>

      <div data-tour="history-list" className="space-y-5">
        {isHistoryLoading ? (
          <div className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-card">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="h-9 w-9" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-2/5" />
                </div>
                <Skeleton className="h-8 w-14" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title={EMPTY_COPY[filter].title}
            description={EMPTY_COPY[filter].description}
            action={
              <Link
                to={filter === 'run' ? '/athlete/running' : '/athlete/workouts'}
                className={buttonVariants({ size: 'sm' })}
              >
                {filter === 'run' ? 'Zacznij bieg' : 'Wybierz trening'}
              </Link>
            }
          />
        ) : (
          <>
            {groups.map(group => {
              const totals = monthTotals.get(group.key);
              const summary = [
                totals && totals.volume > 0 ? `${Math.round(totals.volume).toLocaleString('pl-PL')} kg` : null,
                totals && totals.km > 0 ? `${formatKm(totals.km, 1)} km` : null,
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <section key={group.key}>
                  <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
                    <h2 className="text-[15px] font-semibold capitalize leading-tight">{group.label}</h2>
                    {summary && <span className="text-xs font-semibold tabular-nums text-muted-foreground">{summary}</span>}
                  </div>
                  <div className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-card">
                    <AnimatePresence initial={false}>
                      {group.items.map(item => (
                        <motion.div
                          key={`${item.kind}-${item.id}`}
                          layout
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <HistoryRow
                            item={item}
                            editing={editing}
                            deleting={deletingId === item.id}
                            onDelete={setPendingDelete}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              );
            })}

            {filtered.length > limit && (
              <Button variant="outline" className="w-full" onClick={() => setLimit(l => l + PAGE_SIZE)}>
                Pokaż starsze ({filtered.length - limit})
              </Button>
            )}
          </>
        )}
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={open => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć ten trening?</AlertDialogTitle>
            <AlertDialogDescription>
              Tej operacji nie można cofnąć. To spowoduje trwałe usunięcie treningu „{pendingDelete?.log.workoutName}” z dnia{' '}
              {pendingDelete ? format(pendingDelete.date, 'd.MM.yyyy') : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && handleDelete(pendingDelete)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
