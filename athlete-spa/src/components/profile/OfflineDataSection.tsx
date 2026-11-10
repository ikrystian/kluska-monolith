import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CloudDownload, Film, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  cancelOfflineDownload,
  deleteOfflineExercises,
  downloadOfflineExercises,
  getOfflineExercisesState,
  subscribeOfflineExercises,
} from '@/lib/offline-exercises';
import { SettingsGroup, SettingsRow } from './profile-ui';

const C = {
  download: 'hsl(var(--primary))',
  animations: 'hsl(var(--chart-2))',
  delete: 'hsl(var(--destructive))',
};

const ANIMATIONS_PREF_KEY = 'athlete-spa:offline-animations';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function readAnimationsPref(): boolean {
  try {
    return localStorage.getItem(ANIMATIONS_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

/** "Pobierz dane": the exercise library with media stored on the device for fully offline search. */
export function OfflineDataSection() {
  const { toast } = useToast();
  const { ready, meta, mediaBytes, progress, error } = useSyncExternalStore(
    subscribeOfflineExercises,
    getOfflineExercisesState
  );
  const [withAnimations, setWithAnimations] = useState(readAnimationsPref);
  const downloading = progress !== null;

  // Report the outcome once a download this screen started finishes.
  const wasDownloading = useRef(false);
  useEffect(() => {
    if (wasDownloading.current && !downloading) {
      if (error) {
        toast({ variant: 'destructive', title: 'Nie udało się pobrać danych', description: error });
      } else if (meta) {
        toast({
          title: 'Dane pobrane',
          description: meta.failedMedia
            ? `Ćwiczenia działają offline. ${meta.failedMedia} plików nie udało się pobrać — spróbuj ponownie później.`
            : 'Ćwiczenia działają teraz w 100% offline.',
        });
      }
    }
    wasDownloading.current = downloading;
  }, [downloading, error, meta, toast]);

  const handleAnimationsChange = (checked: boolean) => {
    setWithAnimations(checked);
    try {
      localStorage.setItem(ANIMATIONS_PREF_KEY, checked ? '1' : '0');
    } catch {
      // Preference just won't stick.
    }
  };

  const status = meta
    ? `${meta.exerciseCount.toLocaleString('pl-PL')} ćwiczeń · ${formatBytes(mediaBytes)} · ${format(
        new Date(meta.downloadedAt),
        'd MMM, HH:mm',
        { locale: pl }
      )}`
    : 'Ćwiczenia z obrazkami na telefonie — wyszukiwanie bez internetu.';

  const progressLabel = !progress
    ? ''
    : progress.phase === 'exercises'
      ? 'Pobieranie listy ćwiczeń…'
      : progress.phase === 'saving'
        ? 'Zapisywanie…'
        : `Multimedia ${progress.done.toLocaleString('pl-PL')} / ${progress.total.toLocaleString('pl-PL')} · ${formatBytes(progress.bytes)}`;
  const percent = progress?.phase === 'media' && progress.total ? (progress.done / progress.total) * 100 : progress?.phase === 'saving' ? 100 : 0;

  return (
    <SettingsGroup
      title="Dane offline"
      footer={
        meta
          ? 'Wyszukiwanie i filtry ćwiczeń działają na pobranych danych, bez zapytań do serwera. Zaktualizuj, gdy pojawią się nowe ćwiczenia.'
          : 'Bez animacji to ok. 20 MB, z animacjami ok. 400 MB — najlepiej pobierać przez Wi‑Fi.'
      }
    >
      <SettingsRow
        icon={CloudDownload}
        color={C.download}
        title="Pobierz dane"
        description={meta?.withAnimations ? `${status} · z animacjami` : status}
        disabled={!ready}
        control={
          <Button
            type="button"
            size="sm"
            variant={meta ? 'secondary' : 'default'}
            disabled={!ready || downloading}
            onClick={() => void downloadOfflineExercises({ withAnimations })}
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : meta ? 'Aktualizuj' : 'Pobierz'}
          </Button>
        }
      />

      {progress && (
        <div className="space-y-2 px-4 py-3.5">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="tabular-nums">{progressLabel}</span>
            {progress.phase !== 'saving' && (
              <button type="button" className="font-semibold text-foreground" onClick={cancelOfflineDownload}>
                Anuluj
              </button>
            )}
          </div>
          <Progress value={percent} aria-label="Postęp pobierania" />
        </div>
      )}

      <SettingsRow
        icon={Film}
        color={C.animations}
        htmlFor="offline-animations"
        title="Animacje ćwiczeń"
        description="Filmy z ruchem w szczegółach ćwiczenia (ok. 400 MB)."
        disabled={downloading}
        control={
          <Switch
            id="offline-animations"
            checked={withAnimations}
            disabled={downloading}
            onCheckedChange={handleAnimationsChange}
          />
        }
      />

      {meta && !downloading && (
        <SettingsRow
          icon={Trash2}
          color={C.delete}
          title="Usuń dane offline"
          description="Zwolni miejsce; ćwiczenia znów będą wczytywane z serwera."
          control={
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-destructive/30 text-destructive"
              onClick={() => {
                void deleteOfflineExercises().then(() => toast({ title: 'Usunięto dane offline' }));
              }}
            >
              Usuń
            </Button>
          }
        />
      )}
    </SettingsGroup>
  );
}
