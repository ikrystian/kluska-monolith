import { useMemo, useState } from 'react';
import { Calculator, AlertCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  BAR_OPTIONS,
  calculatePlates,
  getPreferredBarWeight,
  groupPlates,
  setPreferredBarWeight,
} from '@/lib/plate-math';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

/** Plate colours follow the IWF calibrated-disc convention gyms label by. */
const PLATE_STYLES: Record<number, string> = {
  25: 'bg-red-600 text-white',
  20: 'bg-blue-600 text-white',
  15: 'bg-yellow-500 text-black',
  10: 'bg-green-600 text-white',
  5: 'bg-white text-black',
  2.5: 'bg-neutral-800 text-white ring-1 ring-white/25',
  1.25: 'bg-neutral-500 text-white',
};

/** Bigger plates sit further in; height encodes diameter. */
function plateHeight(plate: number): string {
  if (plate >= 20) return 'h-16';
  if (plate >= 15) return 'h-14';
  if (plate >= 10) return 'h-12';
  if (plate >= 5) return 'h-10';
  if (plate >= 2.5) return 'h-8';
  return 'h-6';
}

/**
 * Works out what to hang on each side of the bar for the set's target weight.
 *
 * Doing this arithmetic mid-session, between sets, is the single most repeated
 * mental task in a barbell workout, and the one people most often get wrong
 * when tired.
 */
export function PlateCalculator({ targetWeight }: { targetWeight: number | undefined }) {
  const [open, setOpen] = useState(false);
  const [barWeight, setBarWeight] = useState(getPreferredBarWeight);

  const weight = Number(targetWeight) || 0;
  const breakdown = useMemo(() => calculatePlates(weight, barWeight), [weight, barWeight]);
  const grouped = useMemo(() => groupPlates(breakdown.plates), [breakdown.plates]);

  const chooseBar = (next: number) => {
    haptic('tap');
    setBarWeight(next);
    setPreferredBarWeight(next);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Kalkulator talerzy"
          onClick={() => haptic('tap')}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border/60 text-muted-foreground transition-colors active:scale-90 active:bg-secondary"
        >
          <Calculator className="h-4 w-4" />
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-[2rem] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <SheetHeader className="text-left">
          <SheetTitle className="font-headline">Kalkulator talerzy</SheetTitle>
          <SheetDescription>
            {weight > 0 ? `Cel: ${weight} kg` : 'Podaj ciężar w serii, aby zobaczyć rozkład.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Bar selection — remembered between sessions */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Gryf</p>
            <div className="grid grid-cols-2 gap-2">
              {BAR_OPTIONS.map(option => (
                <button
                  key={option.weight}
                  type="button"
                  onClick={() => chooseBar(option.weight)}
                  className={cn(
                    'rounded-xl border p-2.5 text-sm font-semibold transition-colors active:scale-[0.97]',
                    barWeight === option.weight
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-border/60 text-muted-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading diagram */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Na jedną stronę
            </p>

            {breakdown.belowBar ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Cel jest niższy niż sam gryf ({barWeight} kg).
              </p>
            ) : grouped.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Sam gryf — bez talerzy.
              </p>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
                <div className="flex items-center justify-center gap-1">
                  {/* Sleeve, then plates from the collar outwards */}
                  <span aria-hidden className="mr-1 h-2 w-6 rounded-full bg-muted-foreground/40" />
                  {breakdown.plates.map((plate, index) => (
                    <span
                      key={`${plate}-${index}`}
                      className={cn(
                        'grid w-7 place-items-center rounded-md text-[10px] font-bold tabular-nums shadow-soft',
                        plateHeight(plate),
                        PLATE_STYLES[plate] ?? 'bg-muted text-foreground'
                      )}
                    >
                      {plate}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {grouped.map(({ plate, count }) => (
                    <span
                      key={plate}
                      className="rounded-full bg-card px-2.5 py-1 text-xs font-semibold tabular-nums shadow-soft"
                    >
                      {count}× {plate} kg
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reality check when the target isn't loadable */}
          {breakdown.remainder !== 0 && !breakdown.belowBar && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Dostępnymi talerzami złożysz <strong>{breakdown.achievable} kg</strong> — brakuje{' '}
                {breakdown.remainder} kg do celu.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
