import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { format, isToday, isYesterday } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Circle,
  Dumbbell,
  Footprints,
  Loader2,
  MessageSquarePlus,
  Minus,
  Plus,
  Ruler,
  SquareCheck,
  Target,
  UtensilsCrossed,
  Weight,
  type LucideIcon,
} from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { StartRunDialog } from '@/components/running/StartRunDialog';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { useTodayHabits } from '@/hooks/useTodayHabits';
import { jsonFetcher, useCollection, useCreateDoc, useUser } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import { MEAL_TYPE_LABELS, formatKcal, mealForNow, todayISO, type DiaryResponse } from '@/lib/nutrition';
import { cn } from '@/lib/utils';
import type { BodyMeasurement, RunningProgram } from '@/lib/types';

function formatKg(value: number) {
  return value.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** "dziś", "wczoraj" or a short date — when the last weigh-in was. */
function whenLabel(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  if (isToday(parsed)) return 'dziś';
  if (isYesterday(parsed)) return 'wczoraj';
  return format(parsed, 'd MMM', { locale: pl });
}

/* ───────────────────────── Building blocks ───────────────────────── */

/** The two things the app is for, as big coloured tiles. */
function HeroTile({ className, icon: Icon, title, hint, onClick }: { className: string; icon: LucideIcon; title: string; hint: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('relative flex h-24 min-w-0 flex-col justify-between rounded-2xl p-3.5 text-left transition-transform active:scale-[0.97]', className)}
    >
      <Icon className="h-6 w-6" />
      <ArrowUpRight aria-hidden className="absolute right-3 top-3 h-4 w-4 opacity-60" />
      <span className="min-w-0">
        <span className="block font-display text-[1.625rem] font-bold uppercase leading-none">{title}</span>
        <span className="mt-1 block truncate text-xs font-medium opacity-80">{hint}</span>
      </span>
    </button>
  );
}

function RowIcon({ icon: Icon, className }: { icon: LucideIcon; className: string }) {
  return (
    <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background/60', className)}>
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

/** Title and a line of live status inside the "today" card. */
function RowText({ title, detail }: { title: string; detail: ReactNode }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-[15px] font-semibold leading-tight">{title}</span>
      <span className="block truncate text-xs tabular-nums text-muted-foreground">{detail}</span>
    </span>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="eyebrow mb-2 uppercase tracking-wide">{children}</p>;
}

/* ───────────────────────── Today card ───────────────────────── */

/** Straight into the food diary, with what is left of today's calories. */
function MealRow({ enabled, onOpen }: { enabled: boolean; onOpen: () => void }) {
  const { user } = useUser();
  // Same key as the dashboard and the diary screen, so this is usually answered from the cache.
  const { data: diary } = useSWR<DiaryResponse>(enabled && user ? `/api/athlete/nutrition/diary?date=${todayISO()}` : null, jsonFetcher);

  const eaten = diary?.totals?.calories ?? 0;
  const goal = diary?.goal?.dailyCalories ?? 0;
  const left = Math.round(goal - eaten);
  const status = !diary
    ? 'Dzienniczek kalorii i skaner'
    : goal > 0
      ? left >= 0
        ? `zostało ${formatKcal(left)} kcal`
        : `ponad cel o ${formatKcal(-left)} kcal`
      : eaten > 0
        ? `${formatKcal(eaten)} kcal dziś`
        : 'Nic jeszcze dziś nie dodano';

  return (
    <button type="button" onClick={onOpen} className="row-tap flex w-full items-center gap-3 px-3 py-3 text-left">
      <RowIcon icon={UtensilsCrossed} className="text-food" />
      <RowText
        title="Posiłek"
        detail={
          <>
            {MEAL_TYPE_LABELS[mealForNow()]} · <span className={cn(goal > 0 && left < 0 && 'text-destructive')}>{status}</span>
          </>
        }
      />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </button>
  );
}

/** Today's habits, ticked off right here; the header row leads to the full screen. */
function HabitsBlock({ onOpen }: { onOpen: () => void }) {
  const { habits, isLoading, isDone, toggle, doneCount } = useTodayHabits();
  const allDone = habits.length > 0 && doneCount === habits.length;

  return (
    <div>
      <button type="button" onClick={onOpen} className="row-tap flex w-full items-center gap-3 px-3 py-3 text-left">
        <RowIcon icon={SquareCheck} className="text-volt" />
        <RowText
          title="Nawyki"
          detail={
            isLoading && habits.length === 0
              ? 'Wczytuję…'
              : habits.length === 0
                ? 'Dodaj pierwszy nawyk'
                : allDone
                  ? 'Wszystkie na dziś odhaczone'
                  : `${doneCount} z ${habits.length} na dziś`
          }
        />
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      </button>

      {habits.length > 0 && (
        // w-0 + min-w-full keeps the scroll row from widening the sheet to fit every chip
        <div className="no-scrollbar flex w-0 min-w-full gap-1.5 overflow-x-auto px-3 pb-3">
          {habits.map((habit) => {
            const done = isDone(habit.id);
            return (
              <button
                key={habit.id}
                type="button"
                role="checkbox"
                aria-checked={done}
                onClick={() => void toggle(habit.id)}
                className={cn(
                  'pressable-sm flex h-9 shrink-0 items-center gap-1.5 rounded-full pl-2.5 pr-3 text-[13px] font-semibold transition-colors',
                  done ? 'bg-lime text-lime-foreground' : 'bg-background/60 text-foreground'
                )}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={2.6} /> : <Circle className="h-4 w-4 text-muted-foreground/70" />}
                <span className="max-w-[9rem] truncate">
                  {habit.icon ? `${habit.icon} ` : ''}
                  {habit.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Weigh-in without leaving the sheet: starts from the last entry, so it's usually two taps. */
function WeightBlock() {
  const { user } = useUser();
  const { toast } = useToast();
  const { createDoc, isLoading } = useCreateDoc();
  const { data: latest } = useCollection<BodyMeasurement>(
    user ? 'bodyMeasurements' : null,
    { ownerId: user?.uid },
    { sort: { date: -1 }, limit: 1 }
  );
  const last = latest?.[0];
  const [weight, setWeight] = useState<number | null>(null);
  /** The value saved from this sheet; the button rests until it is changed again. */
  const [saved, setSaved] = useState<number | null>(null);
  const shown = weight ?? last?.weight ?? 75;
  const justSaved = saved !== null && saved === shown;

  const nudge = (delta: number) => {
    haptic('tap');
    setWeight(Math.max(20, Math.round((shown + delta) * 10) / 10));
  };

  const save = async () => {
    if (!user) return;
    try {
      await createDoc('bodyMeasurements', {
        ownerId: user.uid,
        date: new Date().toISOString(),
        weight: shown,
        circumferences: {},
        photoURLs: [],
        sharedWithTrainer: false,
      });
      haptic('success');
      setSaved(shown);
      toast({ title: 'Waga zapisana', description: `${formatKg(shown)} kg` });
    } catch {
      toast({ title: 'Nie udało się zapisać wagi', variant: 'destructive' });
    }
  };

  const stepButton = 'grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/60 transition-transform active:scale-90';

  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-3">
        <RowIcon icon={Weight} className="text-primary" />
        <RowText
          title="Waga"
          detail={justSaved ? 'Zapisano na dziś' : last ? `ostatnio ${formatKg(last.weight)} kg · ${whenLabel(last.date)}` : 'Zapisz pierwszy pomiar'}
        />
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <button type="button" onClick={() => nudge(-0.1)} aria-label="Zmniejsz o 0,1 kg" className={stepButton}>
          <Minus className="h-4 w-4" />
        </button>
        <p className="min-w-0 flex-1 text-center">
          <span className="font-display text-[2rem] font-bold leading-none tabular-nums">{formatKg(shown)}</span>
          <span className="ml-1 text-sm font-semibold text-muted-foreground">kg</span>
        </p>
        <button type="button" onClick={() => nudge(0.1)} aria-label="Zwiększ o 0,1 kg" className={stepButton}>
          <Plus className="h-4 w-4" />
        </button>
        <Button
          onClick={save}
          disabled={isLoading || justSaved}
          aria-label={justSaved ? 'Zapisano' : undefined}
          className={cn('h-10 w-[5.5rem] shrink-0 rounded-full px-0 text-sm', justSaved && 'bg-lime text-lime-foreground disabled:opacity-100')}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : justSaved ? <Check className="h-4 w-4" strokeWidth={2.6} /> : 'Zapisz'}
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────────── Sheet ───────────────────────── */

const MORE_ACTIONS = [
  { href: '/athlete/measurements?add=1', icon: Ruler, color: 'text-primary', label: 'Pomiary' },
  { href: '/athlete/goals?add=1', icon: Target, color: 'text-primary', label: 'Nowy cel' },
  { href: '/athlete/social', icon: MessageSquarePlus, color: 'text-social', label: 'Status' },
] as const;

/**
 * The "+" in the tab bar: everything an athlete logs in a day, one tap away,
 * so nobody has to remember which screen each thing lives on. Training and
 * running lead; the daily log (meal, habits, weight) shows where the day
 * stands and takes input in place; the rarer entries sit below.
 */
export function QuickAddSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { activeWorkout, hasActiveWorkout } = useActiveWorkout();
  const [runOpen, setRunOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { data: programs } = useCollection<RunningProgram>(open || runOpen ? 'runningPrograms' : null, { isActive: true });

  // The daily log fetches on mount; hold it back until the sheet is first opened.
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  const go = (href: string) => {
    haptic('tap');
    onOpenChange(false);
    navigate(href);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" onOpenAutoFocus={(event) => event.preventDefault()}>
          <SheetHeader className="space-y-0.5">
            <SheetTitle>Dodaj</SheetTitle>
            <SheetDescription className="text-[13px] first-letter:uppercase">{format(new Date(), 'EEEE, d MMMM', { locale: pl })}</SheetDescription>
          </SheetHeader>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <HeroTile
              className="bg-primary text-primary-foreground"
              icon={Dumbbell}
              title={hasActiveWorkout ? 'Wróć' : 'Trening'}
              hint={hasActiveWorkout ? activeWorkout?.workoutName ?? 'Trwa sesja' : 'Szablon albo od zera'}
              onClick={() => go(hasActiveWorkout ? `/athlete/log?logId=${activeWorkout?.id}` : '/athlete/log')}
            />
            <HeroTile
              className="bg-run text-primary-foreground"
              icon={Footprints}
              title="Bieg"
              hint="Trasa z GPS"
              onClick={() => {
                haptic('tap');
                onOpenChange(false);
                setRunOpen(true);
              }}
            />
          </div>

          <section className="mt-5">
            <SectionLabel>Dziennik dnia</SectionLabel>
            <div className="divide-y divide-border/40 overflow-hidden rounded-2xl bg-secondary/40">
              <MealRow enabled={mounted} onOpen={() => go('/athlete/nutrition?add=1')} />
              {mounted && <HabitsBlock onOpen={() => go('/athlete/habits')} />}
              {mounted && <WeightBlock />}
            </div>
          </section>

          <section className="mt-5">
            <SectionLabel>Więcej</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {MORE_ACTIONS.map(({ href, icon: Icon, color, label }) => (
                <button
                  key={href}
                  type="button"
                  onClick={() => go(href)}
                  className="pressable-sm flex min-w-0 flex-col items-center gap-1.5 rounded-2xl bg-secondary/40 px-1 py-2.5"
                >
                  <Icon className={cn('h-5 w-5', color)} />
                  <span className="w-full truncate text-center text-xs font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </section>
        </SheetContent>
      </Sheet>

      <StartRunDialog open={runOpen} onOpenChange={setRunOpen} programs={programs} />
    </>
  );
}
