import type { ReactNode } from 'react';

/* One chapter of the page: a big headline (over a full-bleed still when there is one), then a card rail.
   Modelled on the reference's Training / Competition / Nutrition chapters. */
export function Chapter({
  id,
  title,
  lede,
  image,
  imageClass = 'object-[50%_55%]',
  aside,
  actions,
  children,
}: {
  id: string;
  title: string;
  lede: string;
  image?: { src: string; width: number; height: number };
  imageClass?: string;
  aside?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="bg-paper-2">
      <div className="relative isolate overflow-hidden">
        {image && (
          <>
            <img
              src={image.src}
              alt=""
              width={image.width}
              height={image.height}
              loading="lazy"
              className={`absolute inset-0 -z-20 size-full object-cover ${imageClass}`}
            />
            <div className="absolute inset-0 -z-10 bg-linear-to-t from-paper-2 via-paper-2/55 to-paper/50" />
          </>
        )}

        <div
          className={`shell grid grid-cols-[minmax(0,1fr)] gap-10 pb-12 lg:pb-16 ${
            image ? 'min-h-[26rem] content-end pt-40 lg:min-h-[36rem]' : 'pt-20 lg:pt-28'
          } ${aside ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:items-end lg:gap-16' : ''}`}
        >
          <div>
            <h2 id={`${id}-title`} className="display max-w-[14ch] text-[clamp(2.5rem,6.2vw,5.25rem)]">
              {title}
            </h2>
            <p className="lede mt-5 max-w-xl">{lede}</p>
            {actions && <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">{actions}</div>}
          </div>
          {aside}
        </div>
      </div>

      <div className="pb-16 lg:pb-24">{children}</div>
    </section>
  );
}
