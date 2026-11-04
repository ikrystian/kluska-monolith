import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Dumbbell, Footprints, Loader2, Minus, MessageSquarePlus, NotebookPen, Plus, Ruler, SquareCheck, Target, type LucideIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { StartRunDialog } from '@/components/running/StartRunDialog';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { useCollection, useCreateDoc, useUser } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { BodyMeasurement, RunningProgram } from '@/lib/types';

function formatKg(value: number) {
  return value.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Weigh-in without leaving the sheet: starts from the last entry, so it's usually two taps. */
function QuickWeight({ onSaved }: { onSaved: () => void }) {
  const { user } = useUser();
  const { toast } = useToast();
  const { createDoc, isLoading } = useCreateDoc();
  const { data: latest } = useCollection<BodyMeasurement>(
    user ? 'bodyMeasurements' : null,
    { ownerId: user?.uid },
    { sort: { date: -1 }, limit: 1 }
  );
  const lastWeight = latest?.[0]?.weight;
  const [weight, setWeight] = useState<number | null>(null);
  const shown = weight ?? lastWeight ?? 75;

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
      toast({ title: 'Waga zapisana', description: `${formatKg(shown)} kg` });
      onSaved();
    } catch {
      toast({ title: 'Nie udało się zapisać wagi', variant: 'destructive' });
    }
  };

  return (
    <div className="rounded-2xl bg-secondary/60 p-3">
      <p className="eyebrow px-1">Dzisiejsza waga</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => nudge(-0.1)}
          aria-label="Zmniejsz o 0,1 kg"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary transition-transform active:scale-90"
        >
          <Minus className="h-4 w-4" />
        </button>
        <p className="min-w-0 flex-1 text-center">
          <span className="font-display text-[2.25rem] font-bold leading-none tabular-nums">{formatKg(shown)}</span>
          <span className="ml-1 text-sm font-semibold text-muted-foreground">kg</span>
        </p>
        <button
          type="button"
          onClick={() => nudge(0.1)}
          aria-label="Zwiększ o 0,1 kg"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary transition-transform active:scale-90"
        >
          <Plus className="h-4 w-4" />
        </button>
        <Button onClick={save} disabled={isLoading} className="h-11 shrink-0 px-4">
          {isLoading ? <Loader2 className="animate-spin" /> : 'Zapisz'}
        </Button>
      </div>
    </div>
  );
}

function ActionRow({ icon: Icon, color, label, hint, onClick }: { icon: LucideIcon; color: string; label: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="row-tap flex w-full items-center gap-3 px-3 py-2.5 text-left">
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary', color)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-tight">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </button>
  );
}

function PrimaryTile({ className, icon: Icon, title, hint, onClick }: { className: string; icon: LucideIcon; title: string; hint: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex h-[6.5rem] flex-col justify-between rounded-2xl p-3.5 text-left transition-transform active:scale-[0.97]', className)}
    >
      <Icon className="h-6 w-6" />
      <span>
        <span className="block font-display text-[1.625rem] font-bold uppercase leading-none">{title}</span>
        <span className="mt-1 block text-xs font-medium opacity-80">{hint}</span>
      </span>
    </button>
  );
}

/**
 * The "+" in the tab bar: everything an athlete logs in a day, one tap away,
 * so nobody has to remember which screen each thing lives on.
 */
export function QuickAddSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { activeWorkout, hasActiveWorkout } = useActiveWorkout();
  const [runOpen, setRunOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { data: programs } = useCollection<RunningProgram>(open || runOpen ? 'runningPrograms' : null, { isActive: true });

  // The weigh-in fetches on mount; hold it back until the sheet is first opened.
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
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Dodaj</SheetTitle>
            <SheetDescription className="sr-only">Szybkie zapisywanie treningu, biegu, posiłku i pomiarów</SheetDescription>
          </SheetHeader>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <PrimaryTile
              className="bg-primary text-primary-foreground"
              icon={Dumbbell}
              title={hasActiveWorkout ? 'Wróć' : 'Trening'}
              hint={hasActiveWorkout ? activeWorkout?.workoutName ?? 'Trwa sesja' : 'Szablon albo od zera'}
              onClick={() => go(hasActiveWorkout ? `/athlete/log?logId=${activeWorkout?.id}` : '/athlete/log')}
            />
            <PrimaryTile
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

          <div className="-mx-2 mt-2">
            <ActionRow icon={NotebookPen} color="text-food" label="Posiłek" hint="Dzienniczek kalorii i skaner" onClick={() => go('/athlete/nutrition?add=1')} />
            <ActionRow icon={SquareCheck} color="text-volt" label="Nawyki" hint="Odhacz dzisiejsze" onClick={() => go('/athlete/habits')} />
            <ActionRow icon={Ruler} color="text-primary" label="Pomiary" hint="Obwody i zdjęcia sylwetki" onClick={() => go('/athlete/measurements?add=1')} />
            <ActionRow icon={Target} color="text-primary" label="Cel" hint="Nowy cel do pobicia" onClick={() => go('/athlete/goals')} />
            <ActionRow icon={MessageSquarePlus} color="text-social" label="Status dla ekipy" hint="Napisz, co u Ciebie" onClick={() => go('/athlete/social')} />
          </div>

          {mounted && (
            <div className="mt-2">
              <QuickWeight onSaved={() => onOpenChange(false)} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <StartRunDialog open={runOpen} onOpenChange={setRunOpen} programs={programs} />
    </>
  );
}
