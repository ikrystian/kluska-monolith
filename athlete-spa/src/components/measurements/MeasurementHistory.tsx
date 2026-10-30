import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ArrowDownRight, ArrowUpRight, Camera, Eye, Trash2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { ImageLightbox } from '@/components/shared/ImageLightbox';
import { resolveMediaUrl } from '@/lib/api-client';
import type { BodyMeasurement } from '@/lib/types';
import { CIRCUMFERENCES, formatDelta, metricValue, monthLabel } from './measurement-utils';

const PAGE = 10;

interface MeasurementHistoryProps {
  /** Newest first. */
  measurements: BodyMeasurement[];
  onDelete: (measurement: BodyMeasurement) => Promise<void>;
}

/** Timeline of every entry, grouped by month, replacing the old 8-column table that never fit a phone. */
export function MeasurementHistory({ measurements, onDelete }: MeasurementHistoryProps) {
  const [visible, setVisible] = useState(PAGE);
  const [viewer, setViewer] = useState<{ photos: string[]; index: number } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BodyMeasurement | null>(null);

  const groups = useMemo(() => {
    const out: { month: string; items: { entry: BodyMeasurement; delta: number | null }[] }[] = [];
    measurements.slice(0, visible).forEach((entry, i) => {
      // Weight change against the next-older entry that has a weight.
      const older = measurements.slice(i + 1).find(m => metricValue(m, 'weight') !== undefined);
      const delta = older && entry.weight ? entry.weight - older.weight : null;
      const month = monthLabel(entry.date);
      const group = out[out.length - 1];
      if (group?.month === month) group.items.push({ entry, delta });
      else out.push({ month, items: [{ entry, delta }] });
    });
    return out;
  }, [measurements, visible]);

  return (
    <section>
      <div className="mb-3 px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Dziennik</p>
        <h2 className="font-headline text-2xl font-bold tracking-tight">Historia pomiarów</h2>
      </div>

      <div className="space-y-6">
        {groups.map(group => (
          <div key={group.month}>
            <h3 className="mb-2 px-1 text-xs font-bold capitalize text-muted-foreground">{group.month}</h3>
            <ul className="space-y-2.5">
              {group.items.map(({ entry, delta }) => {
                const date = new Date(entry.date);
                const circs = CIRCUMFERENCES.map(m => ({ m, v: metricValue(entry, m.key) })).filter(c => c.v !== undefined);
                const photos = entry.photoURLs ?? [];
                return (
                  <li key={entry.id} className="flex gap-4 rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-soft">
                    <div className="w-12 shrink-0 text-center">
                      <p className="font-display text-2xl font-extrabold leading-none tabular-nums">{format(date, 'd')}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {format(date, 'LLL', { locale: pl })}
                      </p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="font-headline text-xl font-bold tabular-nums">
                          {entry.weight.toFixed(1)} <span className="text-sm font-medium text-muted-foreground">kg</span>
                        </p>
                        {delta !== null && delta !== 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                            {delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {formatDelta(delta, 'kg')}
                          </span>
                        )}
                      </div>

                      {circs.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {circs.map(({ m, v }) => (
                            <li key={m.key} className="rounded-lg bg-secondary/70 px-2 py-1 text-xs tabular-nums">
                              <span className="text-muted-foreground">{m.label} </span>
                              <span className="font-semibold">{v!.toFixed(1)}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {photos.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {photos.map((url, i) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() => setViewer({ photos, index: i })}
                              aria-label={`Zobacz zdjęcie ${i + 1} z ${photos.length}`}
                              className="h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-border/60 transition-transform active:scale-95"
                            >
                              <img src={resolveMediaUrl(url)} alt="" loading="lazy" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-3">
                          {entry.sharedWithTrainer && (
                            <span className="inline-flex items-center gap-1">
                              <Eye className="h-3.5 w-3.5" /> Widoczne dla trenera
                            </span>
                          )}
                          {photos.length === 0 && (
                            <span className="inline-flex items-center gap-1 opacity-60">
                              <Camera className="h-3.5 w-3.5" /> Bez zdjęć
                            </span>
                          )}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-mr-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Usuń pomiar z ${format(date, 'd MMMM yyyy', { locale: pl })}`}
                          onClick={() => setPendingDelete(entry)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {visible < measurements.length && (
        <Button variant="outline" className="mt-5 w-full rounded-full" onClick={() => setVisible(v => v + PAGE)}>
          Pokaż starsze ({measurements.length - visible})
        </Button>
      )}

      <ImageLightbox
        images={viewer?.photos ?? []}
        index={viewer?.index ?? null}
        onIndexChange={i => setViewer(v => (v && i !== null ? { ...v, index: i } : null))}
        title="Zdjęcia pomiaru"
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={o => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć ten pomiar?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && `Pomiar z ${format(new Date(pendingDelete.date), 'd MMMM yyyy', { locale: pl })} zniknie z historii i wykresów. Tej operacji nie można cofnąć.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) void onDelete(pendingDelete);
                setPendingDelete(null);
              }}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
