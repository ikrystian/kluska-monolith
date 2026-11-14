import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { GarmentArt } from '@/components/shop/GarmentArt';
import { CATEGORY_LABEL, PRODUCTS, formatPrice, type Product, type ProductCategory } from '@/lib/shop';
import { haptic } from '@/lib/haptics';
import { cn } from '@/lib/utils';

type Filter = 'all' | ProductCategory;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Wszystko' },
  { value: 'hoodie', label: CATEGORY_LABEL.hoodie },
  { value: 'tee', label: CATEGORY_LABEL.tee },
];

async function openStore(url: string) {
  if (Capacitor.isNativePlatform()) await Browser.open({ url });
  else window.open(url, '_blank', 'noopener');
}

/** The product photo, or the drawn garment when there is none. */
function ProductMedia({
  product,
  colorIndex = 0,
  imageIndex = 0,
  className,
}: {
  product: Product;
  colorIndex?: number;
  imageIndex?: number;
  className?: string;
}) {
  const currentImage = product.images?.[imageIndex] ?? product.image;
  if (currentImage) {
    return <img src={currentImage} alt={product.name} loading="lazy" className={cn('h-full w-full object-cover', className)} />;
  }
  return <GarmentArt category={product.category} color={product.colors[colorIndex]} print={product.print} className={cn('h-full w-full p-3', className)} />;
}

function ColorDots({ product, selected, onSelect }: { product: Product; selected: number; onSelect?: (index: number) => void }) {
  const size = onSelect ? 'h-9 w-9' : 'h-3.5 w-3.5';
  return (
    <div className={cn('flex', onSelect ? 'gap-2.5' : 'gap-1')}>
      {product.colors.map((color, index) => {
        const dot = cn(size, 'rounded-full border border-foreground/15');
        if (!onSelect) return <span key={color.name} className={dot} style={{ backgroundColor: color.fill }} />;
        return (
          <button
            key={color.name}
            type="button"
            aria-label={color.name}
            aria-pressed={index === selected}
            onClick={() => onSelect(index)}
            className={cn(
              dot,
              'grid place-items-center transition-transform active:scale-90',
              index === selected && 'ring-2 ring-foreground ring-offset-2 ring-offset-popover'
            )}
            style={{ backgroundColor: color.fill, color: color.ink }}
          >
            {index === selected && <Check className="h-4 w-4" />}
          </button>
        );
      })}
    </div>
  );
}

function ProductCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-card text-left transition-transform active:scale-[0.98]"
    >
      <span className="relative block aspect-[3/4] w-full bg-secondary">
        <ProductMedia product={product} />
        {product.badge && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-lime px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-lime-foreground">
            {product.badge}
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-1.5 p-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{CATEGORY_LABEL[product.category]}</span>
        <span className="text-[15px] font-semibold leading-tight">{product.name}</span>
        <span className="mt-auto flex items-end justify-between gap-2 pt-1.5">
          <span className="font-display text-2xl font-bold leading-none tabular-nums">{formatPrice(product.price)}</span>
          <ColorDots product={product} selected={0} />
        </span>
      </span>
    </button>
  );
}

function ProductSheet({ product, onClose }: { product: Product; onClose: () => void }) {
  const [colorIndex, setColorIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const color = product.colors[colorIndex];
  const photos = product.images ?? (product.image ? [product.image] : []);

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom" className="space-y-5">
        <div className={cn('relative overflow-hidden rounded-2xl bg-secondary', photos.length > 0 ? 'aspect-[3/4]' : 'mx-auto aspect-square max-w-[17rem]')}>
          <ProductMedia product={product} colorIndex={colorIndex} imageIndex={photoIndex} />
          {photos.length > 1 && (
            <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5">
              {photos.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Zdjęcie ${index + 1}`}
                  onClick={() => {
                    haptic('tap');
                    setPhotoIndex(index);
                  }}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    index === photoIndex ? 'w-6 bg-white shadow-md' : 'w-2 bg-white/50 hover:bg-white/80'
                  )}
                />
              ))}
            </div>
          )}
        </div>

        <SheetHeader className="pr-0">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle>{product.name}</SheetTitle>
            <span className="shrink-0 font-display text-[1.75rem] font-bold leading-none tabular-nums">{formatPrice(product.price)}</span>
          </div>
          <SheetDescription>{product.tagline}</SheetDescription>
        </SheetHeader>

        <p className="text-[15px] leading-relaxed text-foreground/90">{product.description}</p>

        <div>
          <p className={cn('text-sm font-semibold', product.colors.length > 1 && 'mb-2.5')}>
            Kolor: <span className="font-normal text-muted-foreground">{color.name.toLowerCase()}</span>
          </p>
          {product.colors.length > 1 && (
            <ColorDots
              product={product}
              selected={colorIndex}
              onSelect={index => {
                haptic('tap');
                setColorIndex(index);
              }}
            />
          )}
        </div>

        <div>
          <p className="mb-2.5 text-sm font-semibold">Rozmiar</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map(option => (
              <button
                key={option}
                type="button"
                aria-pressed={option === size}
                onClick={() => {
                  haptic('tap');
                  setSize(option);
                }}
                className={cn(
                  'h-11 min-w-12 rounded-xl px-3 text-[15px] font-semibold transition-transform active:scale-95',
                  option === size ? 'bg-foreground text-background' : 'bg-secondary text-foreground'
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {product.details.map(detail => (
            <li key={detail} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-volt" />
              {detail}
            </li>
          ))}
        </ul>

        {product.url ? (
          <Button className="w-full" size="lg" onClick={() => openStore(product.url!)}>
            Kup w sklepie
            <ExternalLink />
          </Button>
        ) : (
          <Button className="w-full" size="lg" disabled>
            Wkrótce w sprzedaży
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function ShopPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const products = filter === 'all' ? PRODUCTS : PRODUCTS.filter(product => product.category === filter);
  const openProduct = PRODUCTS.find(product => product.id === openId);

  return (
    <div className="page space-y-4">
      <section className="rounded-2xl bg-lime p-4 text-lime-foreground">
        <p className="text-[13px] font-semibold opacity-75">Merch leniwakluska</p>
        <p className="mt-0.5 font-display text-[2.25rem] font-bold uppercase leading-none">Noś swoją formę</p>
        <p className="mt-2 text-sm font-medium opacity-80">Bluzy i koszulki na trening i po nim.</p>
      </section>

      <div className="flex gap-2" role="tablist" aria-label="Kategoria">
        {FILTERS.map(option => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={option.value === filter}
            onClick={() => {
              haptic('tap');
              setFilter(option.value);
            }}
            className={cn(
              'h-10 rounded-full px-4 text-sm font-semibold transition-transform active:scale-95',
              option.value === filter ? 'bg-foreground text-background' : 'bg-card text-muted-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onOpen={() => {
              haptic('tap');
              setOpenId(product.id);
            }}
          />
        ))}
      </div>

      {openProduct && <ProductSheet key={openProduct.id} product={openProduct} onClose={() => setOpenId(null)} />}
    </div>
  );
}
