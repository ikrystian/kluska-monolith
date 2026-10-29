'use client';

import { useEffect, useRef, useState } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/** Bok wynikowego obrazka ćwiczenia w pikselach (kwadrat). */
export const EXERCISE_IMAGE_SIZE = 480;

const WEBP_QUALITY = 0.9;

interface ExerciseImageCropDialogProps {
  /** Wybrany plik; dialog jest otwarty, gdy nie jest `null`. */
  file: File | null;
  onCancel: () => void;
  /** Dostaje przycięty obrazek jako WebP 480×480 px. */
  onConfirm: (file: File) => void;
  isSubmitting?: boolean;
}

/** Zaznaczenie na środku obrazka, o proporcjach 1:1. */
function centerSquareCrop(mediaWidth: number, mediaHeight: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, 1, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}

/** Wycina zaznaczenie i skaluje je do 480×480 px, zapisując jako WebP. */
function renderSquareWebp(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = EXERCISE_IMAGE_SIZE;
  canvas.height = EXERCISE_IMAGE_SIZE;

  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Nie udało się przetworzyć obrazka.'));

  // Zaznaczenie jest w pikselach wyświetlanego obrazka, a wycinamy z oryginału.
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    EXERCISE_IMAGE_SIZE,
    EXERCISE_IMAGE_SIZE,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // Przeglądarka bez obsługi WebP zwraca PNG zamiast błędu.
        if (blob && blob.type === 'image/webp') resolve(blob);
        else reject(new Error('Ta przeglądarka nie obsługuje zapisu WebP.'));
      },
      'image/webp',
      WEBP_QUALITY,
    );
  });
}

export function ExerciseImageCropDialog({
  file,
  onCancel,
  onConfirm,
  isSubmitting = false,
}: ExerciseImageCropDialogProps) {
  const [src, setSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Podgląd wybranego pliku; nowy plik resetuje zaznaczenie.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setError(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const isBusy = isProcessing || isSubmitting;

  const handleConfirm = async () => {
    if (!imgRef.current || !completedCrop) return;

    setIsProcessing(true);
    setError(null);
    try {
      const blob = await renderSquareWebp(imgRef.current, completedCrop);
      const baseName = file?.name.replace(/\.[^.]+$/, '') || 'exercise';
      onConfirm(new File([blob], `${baseName}.webp`, { type: 'image/webp' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się przetworzyć obrazka.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && !isBusy && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Przytnij obrazek</DialogTitle>
          <DialogDescription>
            Zaznacz kwadrat do zapisania. Obrazek zostanie zapisany jako WebP {EXERCISE_IMAGE_SIZE}×{EXERCISE_IMAGE_SIZE} px.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <div className="relative max-h-[400px] overflow-auto">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              className="max-w-full"
            >
              <img
                ref={imgRef}
                alt="Obrazek do przycięcia"
                src={src}
                onLoad={(e) => setCrop(centerSquareCrop(e.currentTarget.width, e.currentTarget.height))}
                className="max-w-full"
              />
            </ReactCrop>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="secondary" onClick={onCancel} disabled={isBusy}>
            Anuluj
          </Button>
          <Button onClick={handleConfirm} disabled={!completedCrop || isBusy}>
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Przesyłanie...' : 'Zapisz obrazek'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
