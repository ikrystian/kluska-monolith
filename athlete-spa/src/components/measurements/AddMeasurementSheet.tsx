import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, Eye, ImagePlus, Loader2, Minus, Plus, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { uploadClientFiles } from '@/lib/upload';
import { useCreateDoc } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import type { BodyMeasurement } from '@/lib/types';
import { CIRCUMFERENCES, seriesOf, type CircumferenceKey } from './measurement-utils';

const PRIMARY: CircumferenceKey[] = ['waist', 'chest', 'biceps', 'hips', 'thigh'];
const SECONDARY: CircumferenceKey[] = ['calf', 'neck'];
const MAX_PHOTOS = 4;

type Draft = Partial<Record<CircumferenceKey, string>>;

interface Photo {
  file: File;
  url: string;
}

const todayValue = () => format(new Date(), 'yyyy-MM-dd');

/** Accepts "82,5" as well as "82.5" — Polish keyboards produce the comma. */
function parseNumber(raw: string | undefined): number | null {
  const text = (raw ?? '').trim().replace(',', '.');
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : NaN;
}

interface AddMeasurementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
  /** Existing entries; the latest values are shown as hints. */
  measurements: BodyMeasurement[];
  onSaved: () => void;
}

/** Bottom sheet for logging weight, tape measurements and progress photos. */
export function AddMeasurementSheet({ open, onOpenChange, ownerId, measurements, onSaved }: AddMeasurementSheetProps) {
  const { toast } = useToast();
  const { createDoc } = useCreateDoc();
  const fileInput = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState(todayValue);
  const [weight, setWeight] = useState('');
  const [circs, setCircs] = useState<Draft>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [shared, setShared] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const latestWeight = useMemo(() => seriesOf(measurements, 'weight').at(-1)?.value, [measurements]);
  const hint = (key: CircumferenceKey) => {
    const v = seriesOf(measurements, key).at(-1)?.value;
    return v ? `poprz. ${v.toFixed(1)}` : 'cm';
  };

  const reset = () => {
    setPhotos(prev => {
      prev.forEach(p => URL.revokeObjectURL(p.url));
      return [];
    });
    setDate(todayValue());
    setWeight('');
    setCircs({});
    setShared(false);
    setShowMore(false);
    setError(null);
  };

  // Start clean each time the sheet opens, and release preview URLs when it unmounts.
  useEffect(() => {
    if (open) reset();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => photos.forEach(p => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const nudgeWeight = (delta: number) => {
    const base = parseNumber(weight);
    const start = base !== null && !Number.isNaN(base) ? base : latestWeight ?? 70;
    setWeight(Math.max(0, start + delta).toFixed(1));
    haptic('tap');
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, MAX_PHOTOS - photos.length)
      .map(file => ({ file, url: URL.createObjectURL(file) }));
    setPhotos(prev => [...prev, ...next]);
  };

  const removePhoto = (index: number) =>
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });

  const submit = async () => {
    setError(null);

    const w = parseNumber(weight);
    if (w === null || Number.isNaN(w) || w <= 0 || w > 500) {
      setError('Podaj prawidłową wagę w kilogramach.');
      return;
    }

    const circumferences: Partial<Record<CircumferenceKey, number>> = {};
    for (const { key, label } of CIRCUMFERENCES) {
      const v = parseNumber(circs[key]);
      if (v === null) continue;
      if (Number.isNaN(v) || v <= 0 || v > 300) {
        setError(`Obwód „${label}” musi być liczbą dodatnią w centymetrach.`);
        return;
      }
      circumferences[key] = v;
    }

    setSaving(true);
    try {
      const photoURLs = photos.length ? (await uploadClientFiles(photos.map(p => p.file))).map(r => r.url) : [];
      // Today keeps the real time of day; a backfilled date lands at noon so it can't slip a day across time zones.
      const when = date === todayValue() ? new Date() : new Date(`${date}T12:00:00`);

      await createDoc('bodyMeasurements', {
        ownerId,
        date: when.toISOString(),
        weight: w,
        circumferences,
        photoURLs,
        sharedWithTrainer: shared,
      });

      haptic('success');
      toast({ title: 'Pomiar zapisany', description: 'Dodano go do historii i wykresów.' });
      onSaved();
      onOpenChange(false);
    } catch {
      toast({ title: 'Nie udało się zapisać pomiaru', description: 'Sprawdź połączenie i spróbuj ponownie.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const field = (key: CircumferenceKey) => {
    const meta = CIRCUMFERENCES.find(c => c.key === key)!;
    return (
      <label key={key} className="block">
        <span className="mb-1 block text-xs font-semibold text-muted-foreground">{meta.label}</span>
        <Input
          inputMode="decimal"
          placeholder={hint(key)}
          value={circs[key] ?? ''}
          onChange={e => setCircs(c => ({ ...c, [key]: e.target.value }))}
          className="h-11 rounded-xl tabular-nums"
        />
      </label>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5"
      >
        <SheetHeader className="mb-5 text-left">
          <SheetTitle className="font-headline text-2xl font-bold">Nowy pomiar</SheetTitle>
          <SheetDescription>Wpisz tylko to, co zmierzyłeś — resztę możesz pominąć.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Weight */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Waga</p>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-full" aria-label="Zmniejsz wagę o 0,1 kg" onClick={() => nudgeWeight(-0.1)}>
                <Minus className="h-5 w-5" />
              </Button>
              <div className="relative flex-1">
                <Input
                  inputMode="decimal"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder={latestWeight ? latestWeight.toFixed(1) : '0.0'}
                  aria-label="Waga w kilogramach"
                  className="h-16 rounded-2xl pr-12 text-center font-display text-3xl font-extrabold tabular-nums"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">kg</span>
              </div>
              <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-full" aria-label="Zwiększ wagę o 0,1 kg" onClick={() => nudgeWeight(0.1)}>
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Circumferences */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Obwody (cm)</p>
            <div className="grid grid-cols-2 gap-3">{PRIMARY.map(field)}</div>
            <button
              type="button"
              onClick={() => setShowMore(s => !s)}
              aria-expanded={showMore}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary"
            >
              Więcej obwodów <ChevronDown className={cn('h-4 w-4 transition-transform', showMore && 'rotate-180')} />
            </button>
            {showMore && <div className="mt-3 grid grid-cols-2 gap-3">{SECONDARY.map(field)}</div>}
          </div>

          {/* Photos */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Zdjęcia sylwetki</p>
            <div className="grid grid-cols-4 gap-2">
              {photos.map((p, i) => (
                <div key={p.url} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border/60">
                  <img src={p.url} alt={`Podgląd zdjęcia ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label={`Usuń zdjęcie ${i + 1}`}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="grid aspect-[3/4] place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary active:scale-95"
                  aria-label="Dodaj zdjęcia"
                >
                  <ImagePlus className="h-6 w-6" />
                </button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => {
                addPhotos(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {/* Date + sharing */}
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 px-4 py-3">
              <span className="text-sm font-semibold">Data pomiaru</span>
              <input
                type="date"
                value={date}
                max={todayValue()}
                onChange={e => e.target.value && setDate(e.target.value)}
                className="bg-transparent text-right text-sm font-medium outline-none"
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border/60 px-4 py-3">
              <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1">
                <span className="block text-sm font-semibold">Udostępnij trenerowi</span>
                <span className="block text-xs text-muted-foreground">Trener zobaczy ten pomiar i zdjęcia.</span>
              </span>
              <Switch checked={shared} onCheckedChange={setShared} />
            </label>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <Button className="h-12 w-full rounded-full text-base" onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zapisz pomiar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
