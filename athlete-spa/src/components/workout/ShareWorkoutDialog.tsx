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
import { blobToBase64, SHARE_SIZES } from '@/lib/share-canvas';
import { renderWorkoutShareImage, type WorkoutShareData } from '@/lib/workout-share-image';
import {
  instagramShareErrorCode,
  isInstagramInstalled,
  isInstagramShareAvailable,
  shareImageToInstagram,
} from '@/lib/instagram-share';

interface ShareWorkoutDialogProps {
  open: boolean;
  onClose: () => void;
  /** Resolved URL of the workout photo that becomes the story's background. */
  photoUrl: string;
  workout: WorkoutShareData;
}

const { width, height } = SHARE_SIZES.story;

export function ShareWorkoutDialog({ open, onClose, photoUrl, workout }: ShareWorkoutDialogProps) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [installed, setInstalled] = useState<boolean | null>(null);
  const imageRef = useRef<Blob | null>(null);

  const nativeAvailable = isInstagramShareAvailable();

  useEffect(() => {
    if (!open) return;
    setInstalled(null);
    void isInstagramInstalled().then(setInstalled);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPreviewUrl(null);
      imageRef.current = null;
      return;
    }

    let cancelled = false;
    let url: string | null = null;
    setIsRendering(true);
    renderWorkoutShareImage(photoUrl, workout)
      .then(blob => {
        if (cancelled) return;
        imageRef.current = blob;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Error rendering workout share image:', error);
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
  }, [open, photoUrl, workout]);

  const handleShare = async () => {
    const image = imageRef.current;
    if (!image) return;

    setIsSharing(true);
    try {
      await shareImageToInstagram('story', await blobToBase64(image));
      onClose();
    } catch (error) {
      const code = instagramShareErrorCode(error);
      console.error('Error sharing workout to Instagram:', error);
      toast({
        title: code === 'NOT_INSTALLED' ? 'Brak Instagrama' : 'Nie udało się udostępnić',
        description:
          code === 'NOT_INSTALLED'
            ? 'Zainstaluj aplikację Instagram, aby udostępnić trening.'
            : 'Instagram nie przyjął obrazka. Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const canShare = nativeAvailable && installed === true && !isRendering && !!previewUrl;

  return (
    <Dialog open={open} onOpenChange={next => { if (!next && !isSharing) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">Udostępnij jako Story</DialogTitle>
          <DialogDescription>Zdjęcie z treningu w ramce aplikacji, ze statystykami na wierzchu.</DialogDescription>
        </DialogHeader>

        <div className="mx-auto w-full max-w-[14rem]" style={{ aspectRatio: `${width} / ${height}` }}>
          {previewUrl && !isRendering ? (
            <img
              src={previewUrl}
              alt={`Podgląd story: ${workout.workoutName}`}
              className="h-full w-full rounded-xl border border-border/60 object-contain"
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
