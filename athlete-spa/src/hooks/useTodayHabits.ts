import { useCallback, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useCollection, useCreateDoc, useDeleteDoc, useUser } from '@/lib/db-hooks';
import { haptic } from '@/lib/haptics';
import type { Habit, HabitLog } from '@/lib/types';

function isDueOn(habit: Habit, day: Date): boolean {
  if (habit.frequency?.type === 'specific_days') {
    return habit.frequency.daysOfWeek?.includes(day.getDay()) ?? false;
  }
  return true;
}

/**
 * Today's habits with an instant tick: the checkbox flips right away and the
 * write follows, so ticking off a morning routine never waits for the network.
 */
export function useTodayHabits() {
  const { user } = useUser();
  const { createDoc } = useCreateDoc();
  const { deleteDoc } = useDeleteDoc();
  const today = useMemo(() => new Date(), []);
  const todayKey = format(today, 'yyyy-MM-dd');

  const { data: habits, isLoading } = useCollection<Habit>(user ? 'habits' : null, { ownerId: user?.uid, isActive: true });
  const { data: logs, refetch } = useCollection<HabitLog>(user ? 'habitlogs' : null, { ownerId: user?.uid, date: todayKey });

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const createdIds = useRef(new Map<string, string>());

  const due = useMemo(() => (habits ?? []).filter(habit => isDueOn(habit, today)), [habits, today]);

  const isDone = useCallback(
    (habitId: string) => overrides[habitId] ?? (logs?.some(log => log.habitId === habitId && log.completed) ?? false),
    [overrides, logs]
  );

  const toggle = useCallback(
    async (habitId: string) => {
      if (!user) return;
      const next = !isDone(habitId);
      setOverrides(prev => ({ ...prev, [habitId]: next }));
      haptic('tap');
      try {
        if (next) {
          const created = await createDoc('habitlogs', { habitId, ownerId: user.uid, date: todayKey, completed: true });
          createdIds.current.set(habitId, created.id ?? created._id);
        } else {
          const logId = logs?.find(log => log.habitId === habitId)?.id ?? createdIds.current.get(habitId);
          if (logId) await deleteDoc('habitlogs', logId);
          createdIds.current.delete(habitId);
        }
        refetch();
      } catch {
        setOverrides(prev => ({ ...prev, [habitId]: !next }));
        haptic('warning');
      }
    },
    [user, isDone, createDoc, deleteDoc, logs, refetch, todayKey]
  );

  const doneCount = due.filter(habit => isDone(habit.id)).length;

  return { habits: due, isLoading, isDone, toggle, doneCount };
}
