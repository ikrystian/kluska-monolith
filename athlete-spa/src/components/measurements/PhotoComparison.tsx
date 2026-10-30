import { useMemo, useRef, useState } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ArrowLeftRight, ChevronsLeftRight, ImageOff, TrendingDown, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { resolveMediaUrl } from '@/lib/api-client';
import type { BodyMeasurement } from '@/lib/types';
import { cn } from '@/lib/utils';

type Mode = 'side' | 'slider';

function label(measurement: BodyMeasurement): string {
  const date = format(new Date(measurement.date), 'd MMM yyyy', { locale: pl });
  return measurement.weight ? `${date} · ${measurement.weight.toFixed(1)} kg` : date;
}

function Frame({ photo, alt }: { photo?: string; alt: string }) {
  return photo ? (
    <img src={resolveMediaUrl(photo)} alt={alt} loading="lazy" draggable={false} className="h-full w-full select-none object-cover" />
  ) : (
    <div className="grid h-full place-items-center text-muted-foreground">
      <ImageOff className="h-6 w-6" />
    </div>
  );
}

function Caption({ text, side }: { text: string; side: 'left' | 'right' }) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md',
        side === 'left' ? 'left-3' : 'right-3'
      )}
    >
      {text}
    </span>
  );
}

function SideBySide({ before, after }: { before?: BodyMeasurement; after?: BodyMeasurement }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        [before, 'Przed'],
        [after, 'Po'],
      ].map(([m, caption]) => {
        const measurement = m as BodyMeasurement | undefined;
        return (
          <div key={caption as string} className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border/60 bg-secondary/40">
            <Frame photo={measurement?.photoURLs?.[0]} alt={`Zdjęcie sylwetki — ${caption}`} />
            <Caption text={caption as string} side="left" />
            {measurement && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 text-xs font-semibold text-white">
                {format(new Date(measurement.date), 'd MMM yyyy', { locale: pl })}
                {measurement.weight ? ` · ${measurement.weight.toFixed(1)} kg` : ''}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Drag the divider to wipe between the "after" photo underneath and the "before" photo on top. */
function Slider({ before, after }: { before?: BodyMeasurement; after?: BodyMeasurement }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);

  const move = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <div
      ref={ref}
      className="relative mx-auto aspect-[3/4] max-w-sm touch-pan-y select-none overflow-hidden rounded-2xl border border-border/60 bg-secondary/40"
      onPointerDown={e => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={e => e.currentTarget.hasPointerCapture(e.pointerId) && move(e.clientX)}
    >
      <Frame photo={after?.photoURLs?.[0]} alt="Zdjęcie sylwetki — po" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Frame photo={before?.photoURLs?.[0]} alt="Zdjęcie sylwetki — przed" />
      </div>

      <Caption text="Przed" side="left" />
      <Caption text="Po" side="right" />

      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_12px_rgba(0,0,0,0.5)]" style={{ left: `${pos}%` }}>
        <span className="absolute top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-primary shadow-lifted">
          <ChevronsLeftRight className="h-4 w-4" />
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={e => setPos(Number(e.target.value))}
        aria-label="Pozycja suwaka porównania zdjęć"
        className="sr-only"
      />
    </div>
  );
}

/**
 * Before/after view of two progress photos.
 *
 * A single shot never reads as progress, so the widest span (oldest vs newest)
 * is shown by default and either end can be swapped for any other photo.
 */
export function PhotoComparison({ measurements }: { measurements: BodyMeasurement[] | null }) {
  const withPhotos = useMemo(
    () =>
      (measurements ?? [])
        .filter(m => (m.photoURLs?.length ?? 0) > 0)
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [measurements]
  );

  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('side');

  if (withPhotos.length === 0) return null;

  const before = withPhotos.find(m => m.id === beforeId) ?? withPhotos[0];
  const after = withPhotos.find(m => m.id === afterId) ?? withPhotos[withPhotos.length - 1];
  const distinct = before.id !== after.id;

  const weightDelta = distinct && before.weight && after.weight ? after.weight - before.weight : null;
  const dayGap = distinct ? Math.abs(differenceInCalendarDays(new Date(after.date), new Date(before.date))) : null;

  return (
    <section className="rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-soft md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <ArrowLeftRight className="h-3.5 w-3.5" /> Sylwetka
          </p>
          <h2 className="font-headline text-2xl font-bold tracking-tight">Przed i po</h2>
        </div>
        {withPhotos.length > 1 && (
          <div className="flex rounded-full bg-secondary p-1" role="group" aria-label="Tryb porównania">
            {([['side', 'Obok'], ['slider', 'Suwak']] as const).map(([id, text]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                aria-pressed={mode === id}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-bold transition-colors',
                  mode === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                {text}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        {mode === 'slider' && withPhotos.length > 1 ? <Slider before={before} after={after} /> : <SideBySide before={before} after={after} />}
      </div>

      {withPhotos.length > 1 ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {([['przed', before, setBeforeId], ['po', after, setAfterId]] as const).map(([name, value, setter]) => (
              <Select key={name} value={value.id} onValueChange={setter}>
                <SelectTrigger aria-label={`Wybierz pomiar „${name}”`} className="rounded-full">
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
            ))}
          </div>

          {(dayGap || weightDelta !== null) && (
            <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {!!dayGap && <span className="tabular-nums">{dayGap} dni różnicy</span>}
              {weightDelta !== null && (
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-foreground">
                  {weightDelta < 0 ? <TrendingDown className="h-4 w-4" /> : weightDelta > 0 ? <TrendingUp className="h-4 w-4" /> : null}
                  {weightDelta > 0 ? '+' : weightDelta < 0 ? '−' : ''}
                  {Math.abs(weightDelta).toFixed(1)} kg
                </span>
              )}
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-center text-sm text-muted-foreground">Dodaj kolejne zdjęcie, aby zobaczyć różnicę w czasie.</p>
      )}
    </section>
  );
}
