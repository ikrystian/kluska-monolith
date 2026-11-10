import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ImagePlus, Loader2, Trophy, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageCropDialog, STORY_ASPECT } from '@/components/shared/ImageCropDialog';
import { resolveMediaUrl } from '@/lib/api-client';
import { uploadClientFiles } from '@/lib/upload';
import { useCreateDoc } from '@/lib/db-hooks';
import { haptic } from '@/lib/haptics';
import type { Achievement } from '@/lib/types';

const MAX_PHOTOS = 4;

interface Photo {
  file: File;
  url: string;
}

interface AddTrophySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
  /** Podpowiedź z ukończonego celu. */
  prefill?: { title: string; description?: string } | null;
  onSaved: () => void;
}

/** Trofeum to własna pamiątka: tytuł, data, kilka słów i zdjęcia. */
export function AddTrophySheet({ open, onOpenChange, ownerId, prefill, onSaved }: AddTrophySheetProps) {
  const { createDoc } = useCreateDoc();
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [photos, setPhotos] = useState<Photo[]>([]);
  /** Wybrane zdjęcia czekające na kadrowanie; pierwsze jest kadrowane teraz. */
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(prefill?.title ?? '');
    setDescription(prefill?.description ?? '');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setError(null);
    setPhotos(previous => {
      previous.forEach(photo => URL.revokeObjectURL(photo.url));
      return [];
    });
  }, [open, prefill]);

  const submit = async () => {
    if (!title.trim()) return setError('Nazwij swoje trofeum.');
    setError(null);
    setSaving(true);
    try {
      const uploaded = await uploadClientFiles(photos.map(photo => photo.file));
      await createDoc('achievements', {
        title: title.trim(),
        description: description.trim(),
        date: new Date(`${date}T12:00:00`).toISOString(),
        photoURLs: uploaded.map(file => file.url),
        ownerId,
      });
      haptic('success');
      onSaved();
      onOpenChange(false);
    } catch (cause) {
      haptic('warning');
      setError(cause instanceof Error ? cause.message : 'Nie udało się zapisać trofeum.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Nowe trofeum</SheetTitle>
            <SheetDescription>Zapisz moment, z którego jesteś dumny — zawody, rekord, przemianę.</SheetDescription>
          </SheetHeader>
          <form
            className="mt-4 space-y-4"
            onSubmit={event => {
              event.preventDefault();
              void submit();
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Tytuł</span>
              <Input value={title} onChange={event => setTitle(event.target.value)} placeholder="np. Pierwszy półmaraton" maxLength={120} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Data</span>
              <Input type="date" value={date} max={format(new Date(), 'yyyy-MM-dd')} onChange={event => setDate(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Opis</span>
              <Textarea
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="Co się wydarzyło? (opcjonalnie)"
                rows={3}
                maxLength={500}
              />
            </label>

            <div>
              <span className="mb-1.5 block text-sm font-medium">Zdjęcia</span>
              <div className="grid grid-cols-4 gap-2">
                {photos.map(photo => (
                  <div key={photo.url} className="relative aspect-[9/16] overflow-hidden rounded-xl bg-secondary">
                    <img src={photo.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label="Usuń zdjęcie"
                      onClick={() => {
                        URL.revokeObjectURL(photo.url);
                        setPhotos(previous => previous.filter(item => item.url !== photo.url));
                      }}
                      className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="pressable grid aspect-[9/16] place-items-center rounded-xl border border-dashed border-border text-muted-foreground"
                  >
                    <ImagePlus className="h-5 w-5" />
                    <span className="sr-only">Dodaj zdjęcie</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={event => {
                  const files = Array.from(event.target.files ?? []).slice(0, MAX_PHOTOS - photos.length);
                  if (files.length > 0) setCropQueue(previous => [...previous, ...files]);
                  // Reset, żeby ponowny wybór tego samego pliku też wywołał onChange.
                  event.target.value = '';
                }}
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Dodaj trofeum
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <ImageCropDialog
        file={cropQueue[0] ?? null}
        aspect={STORY_ASPECT}
        onCancel={() => setCropQueue(previous => previous.slice(1))}
        onConfirm={cropped => {
          setPhotos(previous => [...previous, { file: cropped, url: URL.createObjectURL(cropped) }]);
          setCropQueue(previous => previous.slice(1));
        }}
      />
    </>
  );
}

/** Galeria trofeów: kafle ze zdjęciem; dotknięcie otwiera całość. */
export function TrophyGallery({ achievements }: { achievements: Achievement[] }) {
  const [opened, setOpened] = useState<Achievement | null>(null);

  return (
    <>
      <ul className="grid grid-cols-2 gap-2.5">
        {achievements.map(achievement => {
          const cover = achievement.photoURLs?.[0];
          return (
            <li key={achievement.id}>
              <button
                type="button"
                onClick={() => setOpened(achievement)}
                className="pressable relative block aspect-[3/4] w-full overflow-hidden rounded-2xl bg-card text-left"
              >
                {cover ? (
                  <img src={resolveMediaUrl(cover)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-food/70">
                    <Trophy className="h-10 w-10" />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3 pt-10 text-white">
                  <span className="line-clamp-2 block text-sm font-semibold leading-tight">{achievement.title}</span>
                  <span className="mt-0.5 block text-xs text-white/75">
                    {format(new Date(achievement.date), 'd MMM yyyy', { locale: pl })}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={opened !== null} onOpenChange={open => !open && setOpened(null)}>
        <SheetContent side="bottom">
          {opened && (
            <>
              <SheetHeader>
                <SheetTitle>{opened.title}</SheetTitle>
                <SheetDescription>{format(new Date(opened.date), 'd MMMM yyyy', { locale: pl })}</SheetDescription>
              </SheetHeader>
              {opened.description && <p className="mt-3 text-sm text-muted-foreground">{opened.description}</p>}
              {opened.photoURLs?.length > 0 && (
                <div className="no-scrollbar -mx-5 mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5">
                  {opened.photoURLs.map((url, index) => (
                    <img
                      key={url}
                      src={resolveMediaUrl(url)}
                      alt={`${opened.title} — zdjęcie ${index + 1}`}
                      className="h-[55dvh] shrink-0 snap-center rounded-2xl object-contain"
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
