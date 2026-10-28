import { useMemo, useState } from 'react';
import { ChevronDown, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatPaceSec, paceDistribution, parsePaceSec, zoneRangeLabel, type PaceSample } from '@/lib/run-pace';

function formatDuration(totalSeconds: number) {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

const SOURCE_LABEL = {
  custom: 'ustawione przez Ciebie',
  estimated: 'szacowane z Twojego najszybszego biegu',
  fallback: 'szacowane z tego biegu',
} as const;

interface PaceDistributionProps {
  samples: PaceSample[];
  thresholdSecPerKm: number;
  thresholdSource: keyof typeof SOURCE_LABEL;
  onThresholdChange: (secPerKm: number | null) => void;
}

/** Strava-style "pace distribution": time spent in each pace zone as a bar chart. */
export function PaceDistribution({ samples, thresholdSecPerKm, thresholdSource, onThresholdChange }: PaceDistributionProps) {
  const buckets = useMemo(() => paceDistribution(samples, thresholdSecPerKm), [samples, thresholdSecPerKm]);
  const maxPct = Math.max(...buckets.map(b => b.pct), 1);

  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const parsedDraft = parsePaceSec(draft);

  const openEditor = (open: boolean) => {
    if (open) setDraft(formatPaceSec(thresholdSecPerKm));
    setEditorOpen(open);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-semibold">Rozkład tempa</h3>
          <p className="text-xs text-muted-foreground">
            Tempo progowe {formatPaceSec(thresholdSecPerKm)}/km · {SOURCE_LABEL[thresholdSource]}
          </p>
        </div>
        <Popover open={editorOpen} onOpenChange={openEditor}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Tempo progowe
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-3">
            <div>
              <p className="text-sm font-semibold">Tempo progowe</p>
              <p className="text-xs text-muted-foreground">Tempo, które utrzymasz przez ok. 60 minut (min:s na km).</p>
            </div>
            <Input
              inputMode="numeric"
              placeholder="np. 5:00"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              aria-invalid={draft !== '' && parsedDraft === null}
            />
            <div className="flex justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onThresholdChange(null);
                  setEditorOpen(false);
                }}
              >
                Szacuj automatycznie
              </Button>
              <Button
                size="sm"
                disabled={parsedDraft === null}
                onClick={() => {
                  onThresholdChange(parsedDraft);
                  setEditorOpen(false);
                }}
              >
                Zapisz
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Bars */}
      <div className="flex h-44 items-end gap-2 rounded-lg border p-3 pb-0" role="img" aria-label="Czas w strefach tempa">
        {buckets.map(({ zone, pct }) => (
          <div key={zone.id} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[11px] font-semibold tabular-nums">{Math.round(pct)}%</span>
            <div
              className="w-full max-w-12 rounded-t-md transition-[height] duration-500"
              style={{ height: `${(pct / maxPct) * 75}%`, minHeight: pct > 0 ? 3 : 0, backgroundColor: zone.color }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 px-3 pt-1.5">
        {buckets.map(({ zone }, i) => (
          <span key={zone.id} className="flex-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Z{i + 1}
          </span>
        ))}
      </div>

      {/* Zone table */}
      <div className="mt-3 divide-y rounded-lg border text-sm">
        {buckets.map(({ zone, seconds, pct }, i) => (
          <div key={zone.id} className={cn('flex items-center gap-3 px-3 py-2', seconds === 0 && 'text-muted-foreground')}>
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: zone.color }} />
            <span className="min-w-0 flex-1 truncate font-medium">
              Z{i + 1} {zone.name}
            </span>
            <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
              {zoneRangeLabel(zone, thresholdSecPerKm)}/km
            </span>
            <span className="w-14 text-right tabular-nums">{formatDuration(seconds)}</span>
            <span className="w-10 text-right font-semibold tabular-nums">{Math.round(pct)}%</span>
          </div>
        ))}
      </div>

      <Collapsible className="mt-2">
        <CollapsibleTrigger className="group flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
          Co oznaczają strefy?
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {buckets.map(({ zone }, i) => (
            <div key={zone.id} className="flex gap-2 text-xs">
              <span className="mt-0.5 h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: zone.color }} />
              <p>
                <span className="font-semibold">
                  Z{i + 1} {zone.name}
                </span>{' '}
                <span className="tabular-nums text-muted-foreground">({zoneRangeLabel(zone, thresholdSecPerKm)}/km)</span> —{' '}
                <span className="text-muted-foreground">{zone.description}</span>
              </p>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
