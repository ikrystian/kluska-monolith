'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { LocalUploadButton } from '@/components/shared/LocalUploadButton';
import { useToast } from '@/hooks/use-toast';
import {
  PROMO_AUDIENCES,
  PROMO_AUDIENCE_LABEL,
  PROMO_LIMITS,
  PROMO_LINK_PRESETS,
  PROMO_TONES,
  PROMO_TONE_LABEL,
  PROMO_TYPES,
  PROMO_TYPE_LABEL,
  SHOP_PRODUCT_OPTIONS,
  type DashboardPromoData,
  type PromoAudience,
  type PromoTone,
  type PromoType,
} from '@/lib/dashboard-promos';
import { resolveStoredImageUrl } from '@/lib/upload';

export interface PromoArticleOption {
  id: string;
  title: string;
}

interface FormState {
  type: PromoType;
  title: string;
  text: string;
  imageUrl: string;
  ctaLabel: string;
  /** `none`, one of the preset paths, or `custom` (then `customLink` holds the address). */
  linkChoice: string;
  customLink: string;
  productId: string;
  articleId: string;
  tone: PromoTone;
  audience: PromoAudience;
  dismissible: boolean;
  active: boolean;
  /** `datetime-local` values, in the admin's own time zone. */
  startsAt: string;
  endsAt: string;
  order: string;
}

const NO_LINK = 'none';
const CUSTOM_LINK = 'custom';

const toLocalInput = (iso: string | null) => (iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : '');
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

function initialState(promo: DashboardPromoData | null, nextOrder: number): FormState {
  const link = promo?.link ?? '';
  const isPreset = PROMO_LINK_PRESETS.some((preset) => preset.href === link);

  return {
    type: promo?.type ?? 'banner',
    title: promo?.title ?? '',
    text: promo?.text ?? '',
    imageUrl: promo?.imageUrl ?? '',
    ctaLabel: promo?.ctaLabel ?? '',
    linkChoice: !link ? NO_LINK : isPreset ? link : CUSTOM_LINK,
    customLink: link && !isPreset ? link : '',
    productId: promo?.productId ?? '',
    articleId: promo?.articleId ?? '',
    tone: promo?.tone ?? 'neutral',
    audience: promo?.audience ?? 'all',
    dismissible: promo?.dismissible ?? true,
    active: promo?.active ?? true,
    startsAt: toLocalInput(promo?.startsAt ?? null),
    endsAt: toLocalInput(promo?.endsAt ?? null),
    order: String(promo?.order ?? nextOrder),
  };
}

/** What each type means for the athlete, shown under the type picker. */
const TYPE_HINT: Record<PromoType, string> = {
  banner: 'Duży kafel z tytułem, opcjonalnym zdjęciem w tle i przyciskiem. Może prowadzić do ekranu aplikacji albo na zewnętrzną stronę.',
  product: 'Karta produktu ze sklepu: zdjęcie, nazwa i cena. Dotknięcie otwiera ten produkt w sklepie.',
  article: 'Karta artykułu z bazy wiedzy z okładką i tytułem. Dotknięcie otwiera artykuł.',
  announcement: 'Krótki komunikat w jednym wierszu z ikoną, np. o przerwie technicznej albo nowej funkcji.',
};

interface DashboardPromoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Promo being edited; `null` adds a new one. */
  promo: DashboardPromoData | null;
  articles: PromoArticleOption[];
  /** Order suggested for a new promo, so it lands at the end of the list. */
  nextOrder: number;
  onSaved: () => void;
}

export function DashboardPromoDialog({ open, onOpenChange, promo, articles, nextOrder, onSaved }: DashboardPromoDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(() => initialState(promo, nextOrder));
  const [isSaving, setIsSaving] = useState(false);

  // Each opening starts from the promo being edited (or a blank one).
  useEffect(() => {
    if (open) setForm(initialState(promo, nextOrder));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, promo]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const isBanner = form.type === 'banner';
  const isAnnouncement = form.type === 'announcement';
  const hasOwnLink = isBanner || isAnnouncement;
  const titleRequired = hasOwnLink;

  const handleSave = async () => {
    const link = form.linkChoice === NO_LINK ? '' : form.linkChoice === CUSTOM_LINK ? form.customLink.trim() : form.linkChoice;

    // Fields that do not apply to the chosen type are cleared rather than kept around.
    const payload = {
      type: form.type,
      title: form.title,
      text: form.text,
      imageUrl: isBanner ? form.imageUrl : '',
      ctaLabel: isAnnouncement ? '' : form.ctaLabel,
      link: hasOwnLink ? link : '',
      productId: form.type === 'product' ? form.productId : '',
      articleId: form.type === 'article' ? form.articleId : '',
      tone: form.tone,
      audience: form.audience,
      dismissible: form.dismissible,
      active: form.active,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      order: Number(form.order) || 0,
    };

    setIsSaving(true);
    try {
      const response = await fetch(promo ? `/api/admin/dashboard-promos/${promo.id}` : '/api/admin/dashboard-promos', {
        method: promo ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Nie udało się zapisać treści.');

      toast({ title: 'Zapisano', description: promo ? 'Treść została zaktualizowana.' : 'Treść została dodana.' });
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się zapisać treści.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{promo ? 'Edytuj treść' : 'Nowa treść'}</DialogTitle>
          <DialogDescription>Pojawi się na ekranie głównym sportowca, nad paskiem tygodnia.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="promo-type">Rodzaj</Label>
            <Select value={form.type} onValueChange={(value) => set('type', value as PromoType)}>
              <SelectTrigger id="promo-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROMO_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {PROMO_TYPE_LABEL[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-muted-foreground">{TYPE_HINT[form.type]}</p>
          </div>

          {form.type === 'product' && (
            <div className="space-y-2">
              <Label htmlFor="promo-product">Produkt</Label>
              <Select value={form.productId} onValueChange={(value) => set('productId', value)}>
                <SelectTrigger id="promo-product">
                  <SelectValue placeholder="Wybierz produkt" />
                </SelectTrigger>
                <SelectContent>
                  {SHOP_PRODUCT_OPTIONS.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.type === 'article' && (
            <div className="space-y-2">
              <Label htmlFor="promo-article">Artykuł</Label>
              <Select value={form.articleId} onValueChange={(value) => set('articleId', value)}>
                <SelectTrigger id="promo-article">
                  <SelectValue placeholder={articles.length ? 'Wybierz artykuł' : 'Brak opublikowanych artykułów'} />
                </SelectTrigger>
                <SelectContent>
                  {articles.map((article) => (
                    <SelectItem key={article.id} value={article.id}>
                      {article.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Tylko opublikowane. Gdy artykuł zniknie albo wróci do szkicu, karta przestaje się wyświetlać.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="promo-title">{titleRequired ? 'Tytuł' : 'Nagłówek nad nazwą (opcjonalnie)'}</Label>
            <Input
              id="promo-title"
              value={form.title}
              maxLength={PROMO_LIMITS.title}
              placeholder={form.type === 'product' ? 'Polecamy ze sklepu' : form.type === 'article' ? 'Warto przeczytać' : undefined}
              onChange={(event) => set('title', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-text">Opis (opcjonalnie)</Label>
            <Textarea
              id="promo-text"
              rows={2}
              value={form.text}
              maxLength={PROMO_LIMITS.text}
              onChange={(event) => set('text', event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {form.text.length}/{PROMO_LIMITS.text} znaków. Aplikacja pokazuje najwyżej 2–3 wiersze.
            </p>
          </div>

          {isBanner && (
            <div className="space-y-2">
              <Label>Zdjęcie w tle (opcjonalnie)</Label>
              {form.imageUrl ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveStoredImageUrl(form.imageUrl)}
                    alt="Podgląd zdjęcia banera"
                    className="aspect-[2/1] w-full rounded-lg border object-cover"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => set('imageUrl', '')}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Usuń zdjęcie
                  </Button>
                </div>
              ) : (
                <LocalUploadButton
                  dropzone
                  label="Wybierz zdjęcie"
                  onComplete={(files) => files[0] && set('imageUrl', files[0].url)}
                  onError={(error) => toast({ title: 'Błąd', description: error.message, variant: 'destructive' })}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Poziome, ok. 1200×600 px. Tytuł leży na dolnej części zdjęcia, więc ważne elementy trzymaj u góry. Bez zdjęcia
                baner ma jednolite tło w wybranym kolorze.
              </p>
            </div>
          )}

          {hasOwnLink && (
            <div className="space-y-2">
              <Label htmlFor="promo-link">Dokąd prowadzi</Label>
              <Select value={form.linkChoice} onValueChange={(value) => set('linkChoice', value)}>
                <SelectTrigger id="promo-link">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LINK}>Donikąd (sama informacja)</SelectItem>
                  {PROMO_LINK_PRESETS.map((preset) => (
                    <SelectItem key={preset.href} value={preset.href}>
                      {preset.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_LINK}>Własny adres…</SelectItem>
                </SelectContent>
              </Select>
              {form.linkChoice === CUSTOM_LINK && (
                <>
                  <Input
                    aria-label="Własny adres"
                    value={form.customLink}
                    maxLength={PROMO_LIMITS.link}
                    placeholder="https://… albo /athlete/…"
                    onChange={(event) => set('customLink', event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Adres https:// otwiera się w przeglądarce, ścieżka /athlete/… wewnątrz aplikacji.
                  </p>
                </>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {!isAnnouncement && (
              <div className="space-y-2">
                <Label htmlFor="promo-cta">Tekst przycisku (opcjonalnie)</Label>
                <Input
                  id="promo-cta"
                  value={form.ctaLabel}
                  maxLength={PROMO_LIMITS.ctaLabel}
                  placeholder={form.type === 'product' ? 'Zobacz' : form.type === 'article' ? 'Czytaj' : 'np. Sprawdź'}
                  onChange={(event) => set('ctaLabel', event.target.value)}
                />
              </div>
            )}
            {hasOwnLink && (
              <div className="space-y-2">
                <Label htmlFor="promo-tone">Kolor</Label>
                <Select value={form.tone} onValueChange={(value) => set('tone', value as PromoTone)}>
                  <SelectTrigger id="promo-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMO_TONES.map((tone) => (
                      <SelectItem key={tone} value={tone}>
                        {PROMO_TONE_LABEL[tone]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="promo-audience">Odbiorcy</Label>
              <Select value={form.audience} onValueChange={(value) => set('audience', value as PromoAudience)}>
                <SelectTrigger id="promo-audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROMO_AUDIENCES.map((audience) => (
                    <SelectItem key={audience} value={audience}>
                      {PROMO_AUDIENCE_LABEL[audience]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-order">Kolejność</Label>
              <Input
                id="promo-order"
                type="number"
                min={0}
                max={9999}
                value={form.order}
                onChange={(event) => set('order', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-starts">Początek (opcjonalnie)</Label>
              <Input id="promo-starts" type="datetime-local" value={form.startsAt} onChange={(event) => set('startsAt', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-ends">Koniec (opcjonalnie)</Label>
              <Input id="promo-ends" type="datetime-local" value={form.endsAt} onChange={(event) => set('endsAt', event.target.value)} />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Mniejsza kolejność wyświetla się wcześniej. Bez dat treść jest widoczna, dopóki jest włączona.
          </p>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="promo-dismissible" className="cursor-pointer">Można zamknąć</Label>
                <p className="text-xs text-muted-foreground">Sportowiec może ukryć treść krzyżykiem; nie wróci na tym urządzeniu.</p>
              </div>
              <Switch id="promo-dismissible" checked={form.dismissible} onCheckedChange={(checked) => set('dismissible', checked)} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="promo-active" className="cursor-pointer">Włączona</Label>
                <p className="text-xs text-muted-foreground">Wyłączona treść zostaje na liście, ale nikt jej nie widzi.</p>
              </div>
              <Switch id="promo-active" checked={form.active} onCheckedChange={(checked) => set('active', checked)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" disabled={isSaving} onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button type="button" disabled={isSaving} onClick={handleSave}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {promo ? 'Zapisz zmiany' : 'Dodaj treść'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
