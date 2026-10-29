import { useMemo, useState } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ArrowLeftRight, ImageOff, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { resolveMediaUrl } from '@/lib/api-client';
import type { BodyMeasurement } from '@/lib/types';
import { cn } from '@/lib/utils';

function label(measurement: BodyMeasurement): string {
  const date = format(new Date(measurement.date), 'd MMM yyyy', { locale: pl });
  return measurement.weight ? `${date} · ${measurement.weight.toFixed(1)} kg` : date;
}

function Side({
  measurement,
  caption,
}: {
  measurement: BodyMeasurement | undefined;
  caption: string;
}) {
  const photo = measurement?.photoURLs?.[0];

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {caption}
        </span>
        {measurement?.weight ? (
          <span className="text-xs font-semibold tabular-nums">{measurement.weight.toFixed(1)} kg</span>
        ) : null}
      </div>
      <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-border/60 bg-secondary/40">
        {photo ? (
          <img
            src={resolveMediaUrl(photo)}
            alt={`Zdjęcie sylwetki — ${caption}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <ImageOff className="h-6 w-6" />
          </div>
        )}
      </div>
      {measurement && (
        <p className="text-center text-[11px] text-muted-foreground">
          {format(new Date(measurement.date), 'd MMMM yyyy', { locale: pl })}
        </p>
      )}
    </div>
  );
}

/**
 * Side-by-side view of two progress photos.
 *
 * Photos were being uploaded and stored but could only be opened one at a
 * time, which is the one way of looking at them that shows nothing: a single
 * shot never reads as progress. Pairing the oldest with the newest — and
 * letting either end be moved — is what makes months of work visible.
 */
export function PhotoComparison({ measurements }: { measurements: BodyMeasurement[] | null }) {
  const withPhotos = useMemo(
    () =>
      (measurements ?? [])
        .filter(m => (m.photoURLs?.length ?? 0) > 0)
        // Oldest first, so "before" and "after" read left to right.
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [measurements]
  );

  // Default to the widest span available — the comparison people actually want.
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);

  const before = withPhotos.find(m => m.id === beforeId) ?? withPhotos[0];
  const after = withPhotos.find(m => m.id === afterId) ?? withPhotos[withPhotos.length - 1];

  if (withPhotos.length === 0) return null;

  const weightDelta =
    before && after && before.weight && after.weight && before.id !== after.id
      ? after.weight - before.weight
      : null;

  const dayGap =
    before && after && before.id !== after.id
      ? differenceInCalendarDays(new Date(after.date), new Date(before.date))
      : null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-primary" />
          Porównanie sylwetki
        </CardTitle>
        <CardDescription>
          {withPhotos.length < 2
            ? 'Dodaj kolejne zdjęcie, aby zobaczyć różnicę w czasie.'
            : 'Zestaw dwa pomiary ze zdjęciami i zobacz różnicę.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Side measurement={before} caption="Przed" />
          <Side measurement={after} caption="Po" />
        </div>

        {withPhotos.length > 1 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Select value={before?.id ?? ''} onValueChange={setBeforeId}>
                <SelectTrigger aria-label="Wybierz pomiar „przed”">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {withPhotos.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {label(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={after?.id ?? ''} onValueChange={setAfterId}>
                <SelectTrigger aria-label="Wybierz pomiar „po”">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {withPhotos.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {label(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(weightDelta !== null || dayGap !== null) && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {dayGap !== null && dayGap !== 0 && (
                  <Badge variant="secondary" className="tabular-nums">
                    {Math.abs(dayGap)} dni różnicy
                  </Badge>
                )}
                {weightDelta !== null && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'gap-1 tabular-nums',
                      weightDelta < 0 && 'text-volt',
                      weightDelta > 0 && 'text-primary'
                    )}
                  >
                    {weightDelta < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : weightDelta > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : null}
                    {weightDelta > 0 ? '+' : ''}
                    {weightDelta.toFixed(1)} kg
                  </Badge>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
