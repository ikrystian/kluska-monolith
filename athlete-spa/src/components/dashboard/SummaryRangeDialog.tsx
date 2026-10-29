import { useEffect, useState } from 'react';
import { endOfDay, format, parseISO, startOfDay, startOfMonth, startOfYear, subDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/* ---------- Date range ---------- */

export type RangePreset = '7d' | '30d' | 'month' | 'year' | 'all' | 'custom';

export interface SummaryRange {
  preset: RangePreset;
  /** `null` means "from the very beginning". */
  from: Date | null;
  to: Date;
}

const PRESETS: { id: Exclude<RangePreset, 'custom'>; label: string }[] = [
  { id: '7d', label: 'Ostatnie 7 dni' },
  { id: '30d', label: 'Ostatnie 30 dni' },
  { id: 'month', label: 'Ten miesiąc' },
  { id: 'year', label: 'Ten rok' },
  { id: 'all', label: 'Cały czas' },
];

export function presetRange(preset: Exclude<RangePreset, 'custom'>): SummaryRange {
  const now = new Date();
  const to = endOfDay(now);
  switch (preset) {
    case '7d':
      return { preset, from: startOfDay(subDays(now, 6)), to };
    case '30d':
      return { preset, from: startOfDay(subDays(now, 29)), to };
    case 'month':
      return { preset, from: startOfMonth(now), to };
    case 'year':
      return { preset, from: startOfYear(now), to };
    case 'all':
      return { preset, from: null, to };
  }
}

export function rangeLabel(range: SummaryRange): string {
  const preset = PRESETS.find(p => p.id === range.preset);
  if (preset) return preset.label;
  const fmt = (d: Date) => format(d, 'd MMM yyyy', { locale: pl });
  return range.from ? `${fmt(range.from)} – ${fmt(range.to)}` : `do ${fmt(range.to)}`;
}

const toInputValue = (d: Date | null) => (d ? format(d, 'yyyy-MM-dd') : '');

export function SummaryRangeDialog({
  open,
  onOpenChange,
  value,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: SummaryRange;
  onApply: (range: SummaryRange) => void;
}) {
  const [preset, setPreset] = useState<RangePreset>(value.preset);
  const [fromInput, setFromInput] = useState(toInputValue(value.from));
  const [toInput, setToInput] = useState(toInputValue(value.to));

  // Re-seed the draft from the applied range every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setPreset(value.preset);
    setFromInput(toInputValue(value.from));
    setToInput(toInputValue(value.to));
  }, [open, value]);

  const selectPreset = (id: Exclude<RangePreset, 'custom'>) => {
    const r = presetRange(id);
    setPreset(id);
    setFromInput(toInputValue(r.from));
    setToInput(toInputValue(r.to));
  };

  const error =
    preset === 'custom'
      ? !fromInput || !toInput
        ? 'Wybierz datę początkową i końcową.'
        : fromInput > toInput
          ? 'Data początkowa nie może być późniejsza niż końcowa.'
          : null
      : null;

  const apply = () => {
    if (error) return;
    onApply(
      preset === 'custom'
        ? { preset, from: startOfDay(parseISO(fromInput)), to: endOfDay(parseISO(toInput)) }
        : presetRange(preset)
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] rounded-[1.75rem] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zakres podsumowania</DialogTitle>
          <DialogDescription>Wybierz gotowy okres albo ustaw własne daty.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map(p => (
            <Button
              key={p.id}
              type="button"
              variant={preset === p.id ? 'default' : 'outline'}
              onClick={() => selectPreset(p.id)}
              className={cn(p.id === 'all' && 'col-span-2')}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="space-y-3 rounded-2xl border border-border/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Własny zakres</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="summary-from">Od</Label>
              <Input
                id="summary-from"
                type="date"
                value={fromInput}
                max={toInput || undefined}
                onChange={e => {
                  setPreset('custom');
                  setFromInput(e.target.value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="summary-to">Do</Label>
              <Input
                id="summary-to"
                type="date"
                value={toInput}
                min={fromInput || undefined}
                onChange={e => {
                  setPreset('custom');
                  setToInput(e.target.value);
                }}
              />
            </div>
          </div>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="button" onClick={apply} disabled={!!error}>
            Zastosuj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
