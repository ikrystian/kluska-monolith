'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Share2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Goal } from '@/lib/types';
import { blobToBase64, renderGoalShareImage, SHARE_SIZES, type ShareFormat } from '@/lib/goal-share-image';
import {
  instagramShareErrorCode,
  isInstagramInstalled,
  isInstagramShareAvailable,
  shareImageToInstagram,
} from '@/lib/instagram-share';

const FORMAT_OPTIONS: { id: ShareFormat; label: string; ratio: string }[] = [
  { id: 'story', label: 'Story', ratio: '9:16' },
  { id: 'post', label: 'Post', ratio: '4:5' },
];

interface ShareGoalDialogProps {
  /** The dialog is open while a goal is set. */
  goal: Goal | null;
  onClose: () => void;
}

export function ShareGoalDialog({ goal, onClose }: ShareGoalDialogProps) {
  const { toast } = useToast();
  const [shareFormat, setShareFormat] = useState<ShareFormat>('story');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [installed, setInstalled] = useState<boolean | null>(null);
  const imageRef = useRef<Blob | null>(null);

  const nativeAvailable = isInstagramShareAvailable();

  useEffect(() => {
    if (!goal) return;
    setInstalled(null);
    void isInstagramInstalled().then(setInstalled);
  }, [goal]);

  useEffect(() => {
    if (!goal) {
      setPreviewUrl(null);
      imageRef.current = null;
      return;
    }

    let cancelled = false;
    let url: string | null = null;
    setIsRendering(true);
    renderGoalShareImage(goal, shareFormat)
      .then(blob => {
        if (cancelled) return;
        imageRef.current = blob;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Error rendering share image:', error);
        toast({ title: 'Błąd', description: 'Nie udało się przygotować obrazka.', variant: 'destructive' });
      })
      .finally(() => {
        if (!cancelled) setIsRendering(false);
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // toast is stable enough; re-rendering the card on its identity change would flicker the preview
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, shareFormat]);

  const handleShare = async () => {
    const image = imageRef.current;
    if (!image) return;

    setIsSharing(true);
    try {
      await shareImageToInstagram(shareFormat, await blobToBase64(image));
      onClose();
    } catch (error) {
      const code = instagramShareErrorCode(error);
      console.error('Error sharing to Instagram:', error);
      toast({
        title: code === 'NOT_INSTALLED' ? 'Brak Instagrama' : 'Nie udało się udostępnić',
        description:
          code === 'NOT_INSTALLED'
            ? 'Zainstaluj aplikację Instagram, aby udostępnić cel.'
            : 'Instagram nie przyjął obrazka. Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const { width, height } = SHARE_SIZES[shareFormat];
  const canShare = nativeAvailable && installed === true && !isRendering && !!previewUrl;

  return (
    <Dialog open={!!goal} onOpenChange={open => { if (!open && !isSharing) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-headline">Udostępnij cel</DialogTitle>
          <DialogDescription>Wybierz, czy wrzucić go na Instagram jako relację, czy post.</DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="Format udostępniania" className="grid grid-cols-2 gap-1 rounded-full bg-secondary/70 p-1">
          {FORMAT_OPTIONS.map(({ id, label, ratio }) => {
            const active = shareFormat === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setShareFormat(id)}
                className={cn(
                  'flex h-9 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-all',
                  active ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
                <span className="font-normal text-muted-foreground">{ratio}</span>
              </button>
            );
          })}
        </div>

        <div className="mx-auto w-full max-w-[14rem]" style={{ aspectRatio: `${width} / ${height}` }}>
          {previewUrl && !isRendering ? (
            <img
              src={previewUrl}
              alt={`Podgląd: ${goal?.title ?? 'cel'}`}
              className="h-full w-full rounded-xl border border-border/60 object-contain shadow-soft"
            />
          ) : (
            <Skeleton className="h-full w-full rounded-xl" />
          )}
        </div>

        {!nativeAvailable ? (
          <p className="text-center text-xs text-muted-foreground">
            Udostępnianie na Instagramie działa w aplikacji mobilnej na Androidzie.
          </p>
        ) : installed === false ? (
          <p className="text-center text-xs text-muted-foreground">Nie znaleziono aplikacji Instagram na tym urządzeniu.</p>
        ) : null}

        <DialogFooter className="gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSharing}>
            Anuluj
          </Button>
          <Button type="button" onClick={handleShare} disabled={!canShare || isSharing}>
            {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
            Udostępnij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
