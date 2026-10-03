import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footprints, Route, Timer, ChevronRight, Music } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { RunningProgram } from '@/lib/types';

type GoalType = 'distance' | 'time';
type Step = 'choose' | 'goal';

interface StartRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Trainer-prepared trainings the athlete can jump straight into. Omit (or
   *  pass an empty list) to skip the picker and go straight to the quick-run
   *  goal step — used on the Running page, which already lists programs
   *  inline, so the dialog there is only for the "quick run" shortcut. */
  programs?: RunningProgram[] | null;
}

/**
 * Shared "start a run" entry point for both /athlete/running and
 * /athlete/log: pick one of the trainer's programs (starts immediately, the
 * program already carries its own target distance), or start a quick run —
 * which first asks for an optional goal (distance or time) so the recorder
 * can show progress toward it.
 */
export function StartRunDialog({ open, onOpenChange, programs }: StartRunDialogProps) {
  const navigate = useNavigate();
  const hasPrograms = !!programs && programs.length > 0;

  const [step, setStep] = useState<Step>('goal');
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [goalValueStr, setGoalValueStr] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep(hasPrograms ? 'choose' : 'goal');
    setGoalType(null);
    setGoalValueStr('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startRun = (query?: string) => {
    onOpenChange(false);
    navigate(query ? `/athlete/running/record?${query}` : '/athlete/running/record');
  };

  const handleStartProgram = (programId: string) => {
    startRun(`programId=${encodeURIComponent(programId)}`);
  };

  const handleStartWithoutGoal = () => {
    startRun();
  };

  const handleConfirmGoal = () => {
    const value = Number(goalValueStr);
    if (!goalType || !goalValueStr || !Number.isFinite(value) || value <= 0) return;
    startRun(`goalType=${goalType}&goalValue=${value}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {step === 'choose' ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline">Rozpocznij bieg</DialogTitle>
              <DialogDescription>Wybierz trening przygotowany przez trenera albo zacznij biec bez planu.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setStep('goal')}
                className="flex w-full items-center gap-3.5 rounded-2xl border border-border/60 bg-card p-3.5 text-left shadow-soft transition-all hover:border-primary/30 hover:shadow-lifted active:scale-[0.99]"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  <Footprints className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Szybki bieg</p>
                  <p className="text-sm text-muted-foreground">Bez zaplanowanego treningu</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </button>
              {programs?.map((program) => (
                <button
                  key={program.id}
                  type="button"
                  onClick={() => handleStartProgram(program.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-3.5 text-left shadow-soft transition-all hover:border-primary/30 hover:shadow-lifted active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{program.name}</p>
                    <p className="text-sm text-muted-foreground">{program.targetDistanceKm} km</p>
                    {program.cues.length > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Music className="h-3 w-3" />
                        {program.cues.length} sygnałów
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-headline">Ustaw cel</DialogTitle>
              <DialogDescription>Opcjonalnie — wybierz, czym chcesz mierzyć ten bieg.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGoalType('distance')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl border p-4 transition-colors',
                  goalType === 'distance' ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/30'
                )}
              >
                <Route className={cn('h-6 w-6', goalType === 'distance' ? 'text-primary' : 'text-muted-foreground')} />
                <span className="font-semibold">Dystans</span>
              </button>
              <button
                type="button"
                onClick={() => setGoalType('time')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-2xl border p-4 transition-colors',
                  goalType === 'time' ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/30'
                )}
              >
                <Timer className={cn('h-6 w-6', goalType === 'time' ? 'text-primary' : 'text-muted-foreground')} />
                <span className="font-semibold">Czas</span>
              </button>
            </div>
            {goalType && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={goalType === 'distance' ? '0.1' : '1'}
                  value={goalValueStr}
                  onChange={(e) => setGoalValueStr(e.target.value)}
                  placeholder={goalType === 'distance' ? 'np. 5' : 'np. 30'}
                  autoFocus
                />
                <span className="shrink-0 text-sm font-semibold text-muted-foreground">
                  {goalType === 'distance' ? 'km' : 'min'}
                </span>
              </div>
            )}
            <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
              <Button
                className="w-full rounded-xl"
                onClick={handleConfirmGoal}
                disabled={!goalType || !goalValueStr || Number(goalValueStr) <= 0}
              >
                Rozpocznij bieg
              </Button>
              <Button variant="ghost" className="w-full rounded-xl" onClick={handleStartWithoutGoal}>
                Rozpocznij bez celu
              </Button>
              {hasPrograms && (
                <Button variant="ghost" className="w-full rounded-xl" onClick={() => setStep('choose')}>
                  Wróć do wyboru treningu
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
