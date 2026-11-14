'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, Loader2, Pause, Play } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

/** Krok przycisków „klatka w tył / w przód” (ok. jedna klatka przy 24–30 fps). */
const FRAME_STEP = 1 / 24;

interface ExerciseFrameCaptureDialogProps {
  /** URL wideo (MP4/WebM); dialog jest otwarty, gdy nie jest `null`. */
  videoUrl: string | null;
  onCancel: () => void;
  /** Dostaje wybraną klatkę jako PNG w natywnej rozdzielczości wideo. */
  onCapture: (file: File) => void;
}

function formatTime(seconds: number): string {
  return `${seconds.toFixed(2)} s`;
}

/**
 * Mini edytor stop-klatki: przewijanie animacji do dowolnego momentu
 * i zapisanie widocznej klatki jako obrazka.
 */
export function ExerciseFrameCaptureDialog({
  videoUrl,
  onCancel,
  onCapture,
}: ExerciseFrameCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setError(null);
  }, [videoUrl]);

  // Podczas odtwarzania suwak podąża za wideo płynniej niż zdarzenie `timeupdate`.
  useEffect(() => {
    if (!isPlaying) return;
    let frame = requestAnimationFrame(function tick() {
      if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);

  const seek = (time: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.pause();
    const next = Math.min(Math.max(time, 0), duration);
    video.currentTime = next;
    setCurrentTime(next);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    setIsCapturing(true);
    setError(null);
    try {
      video.pause();
      // Czekamy, aż przewijanie się zakończy — inaczej canvas dostałby poprzednią klatkę.
      if (video.seeking) {
        await new Promise<void>((resolve) =>
          video.addEventListener('seeked', () => resolve(), { once: true }),
        );
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Nie udało się przetworzyć klatki.');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Nie udało się zapisać klatki.');
      onCapture(new File([blob], `stop-klatka-${video.currentTime.toFixed(2)}s.png`, { type: 'image/png' }));
    } catch (err) {
      // SecurityError: wideo z obcej domeny bez nagłówków CORS „brudzi” canvas.
      setError(
        err instanceof DOMException && err.name === 'SecurityError'
          ? 'Nie można pobrać klatki z wideo na zewnętrznym serwerze. Prześlij plik animacji do aplikacji.'
          : err instanceof Error ? err.message : 'Nie udało się zapisać klatki.',
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const isReady = duration > 0;

  return (
    <Dialog open={videoUrl !== null} onOpenChange={(open) => !open && !isCapturing && onCancel()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Stop-klatka z animacji</DialogTitle>
          <DialogDescription>
            Przewiń animację do wybranego momentu i zapisz klatkę jako zdjęcie ćwiczenia.
          </DialogDescription>
        </DialogHeader>

        {videoUrl && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                key={videoUrl}
                src={videoUrl}
                // Zewnętrzne wideo musi przyjść z nagłówkami CORS, żeby dało się odczytać klatkę.
                crossOrigin={/^https?:\/\//.test(videoUrl) ? 'anonymous' : undefined}
                className="mx-auto max-h-[50vh] w-full object-contain"
                muted
                playsInline
                preload="auto"
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onError={() => setError('Nie udało się wczytać animacji.')}
              />
            </div>

            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 1}
              step={0.01}
              disabled={!isReady}
              onValueChange={([value]) => seek(value)}
              aria-label="Pozycja w animacji"
            />

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!isReady}
                  onClick={() => seek(currentTime - FRAME_STEP)}
                  aria-label="Klatka wstecz"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!isReady}
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pauza' : 'Odtwórz'}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!isReady}
                  onClick={() => seek(currentTime + FRAME_STEP)}
                  aria-label="Klatka naprzód"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <span className="font-mono text-sm tabular-nums text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isCapturing}>
            Anuluj
          </Button>
          <Button type="button" onClick={handleCapture} disabled={!isReady || isCapturing}>
            {isCapturing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            Użyj tej klatki
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
