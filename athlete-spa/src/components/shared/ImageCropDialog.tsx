'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactCrop, { centerCrop, convertToPixelCrop, type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

/** Instagram Stories / Reels frame. */
export const STORY_ASPECT = 9 / 16;

/** Widest the cropped output gets; keeps uploads small and is Instagram's own story width. */
const MAX_OUTPUT_WIDTH = 1080;

interface ImageCropDialogProps {
  /** The dialog is open while a file is set. */
  file: File | null;
  /** Width / height of the crop frame. */
  aspect?: number;
  title?: string;
  description?: string;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}

/** The largest centred frame of the given aspect that fits inside the image. */
function initialCrop(width: number, height: number, aspect: number): Crop {
  const imageAspect = width / height;
  return centerCrop(
    imageAspect > aspect
      ? { unit: '%', height: 100, width: (aspect / imageAspect) * 100 }
      : { unit: '%', width: 100, height: (imageAspect / aspect) * 100 },
    width,
    height
  );
}

export function ImageCropDialog({
  file,
  aspect = STORY_ASPECT,
  title = 'Przytnij zdjęcie',
  description = 'Przesuń i zmień ramkę, aby wybrać kadr.',
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const { toast } = useToast();
  const imgRef = useRef<HTMLImageElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setCrop(undefined);
    setCompletedCrop(undefined);
    if (!file) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      const next = initialCrop(width, height, aspect);
      setCrop(next);
      // onComplete only fires after the user touches the frame, so seed it
      // here — otherwise "Zatwierdź" would stay disabled for an untouched crop.
      setCompletedCrop(convertToPixelCrop(next, width, height));
    },
    [aspect]
  );

  const handleConfirm = async () => {
    const image = imgRef.current;
    if (!file || !image || !completedCrop) return;

    setIsProcessing(true);
    try {
      // The crop is in displayed pixels; cut from the original so the result
      // keeps the photo's real resolution.
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const sourceWidth = completedCrop.width * scaleX;
      const sourceHeight = completedCrop.height * scaleY;

      const outputWidth = Math.round(Math.min(sourceWidth, MAX_OUTPUT_WIDTH));
      const outputHeight = Math.round(outputWidth / aspect);

      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputWidth,
        outputHeight
      );

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('Encoding failed');

      const baseName = file.name.replace(/\.[^.]+$/, '') || 'zdjecie';
      onConfirm(new File([blob], `${baseName}-kadr.jpg`, { type: 'image/jpeg' }));
    } catch (error) {
      console.error('Error cropping image:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się przetworzyć obrazu.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={open => { if (!open && !isProcessing) onCancel(); }}>
      {/* No autofocus: it would land on "Anuluj", so a stray Enter would drop the photo. */}
      <DialogContent  onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-headline">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          {src && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={setCompletedCrop}
              aspect={aspect}
              keepSelection
              ruleOfThirds
              className="max-w-full"
            >
              <img
                ref={imgRef}
                alt="Zdjęcie do przycięcia"
                src={src}
                onLoad={handleImageLoad}
                style={{ maxHeight: '55vh' }}
                className="max-w-full"
              />
            </ReactCrop>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isProcessing}>
            Anuluj
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!completedCrop || isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Zatwierdź kadr
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
