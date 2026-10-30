import { useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { resolveMediaUrl } from '@/lib/api-client';

interface ImageLightboxProps {
  images: string[];
  /** Index of the open image, or null when closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  title: string;
}

/** Full-size photo viewer with previous/next buttons and arrow-key navigation. */
export function ImageLightbox({ images, index, onIndexChange, title }: ImageLightboxProps) {
  const open = index !== null;

  const step = useCallback(
    (delta: number) => onIndexChange(index === null ? null : (index + delta + images.length) % images.length),
    [index, images.length, onIndexChange]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, step]);

  return (
    <Dialog open={open} onOpenChange={o => !o && onIndexChange(null)}>
      <DialogContent className="max-w-3xl border-0 bg-black/95 p-0 sm:rounded-[1.75rem]">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Zdjęcie {(index ?? 0) + 1} z {images.length}
        </DialogDescription>
        {index !== null && (
          <div className="relative grid place-items-center">
            <img src={resolveMediaUrl(images[index])} alt="" className="max-h-[80vh] w-full rounded-[inherit] object-contain" />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Poprzednie zdjęcie"
                  onClick={() => step(-1)}
                  className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur-md transition-transform active:scale-90"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Następne zdjęcie"
                  onClick={() => step(1)}
                  className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur-md transition-transform active:scale-90"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="absolute bottom-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                  {index + 1} / {images.length}
                </span>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
