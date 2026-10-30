import { useState } from 'react';
import { ImageLightbox } from '@/components/shared/ImageLightbox';
import { resolveMediaUrl } from '@/lib/api-client';

/** Swipeable strip of photos; tapping one opens a full-size viewer. */
export function TrainerGallery({ images, trainerName }: { images: string[]; trainerName: string }) {
  const [index, setIndex] = useState<number | null>(null);

  return (
    <>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:-mx-6 md:px-6 [&::-webkit-scrollbar]:hidden">
        {images.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Powiększ zdjęcie ${i + 1} z ${images.length}`}
            className="group relative h-56 w-44 shrink-0 snap-start overflow-hidden rounded-[1.5rem] shadow-soft transition-transform active:scale-[0.97] sm:h-64 sm:w-52"
          >
            <img
              src={resolveMediaUrl(url)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <ImageLightbox images={images} index={index} onIndexChange={setIndex} title={`Galeria trenera ${trainerName}`} />
    </>
  );
}
