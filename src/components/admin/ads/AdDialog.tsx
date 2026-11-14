'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LocalUploadButton } from '@/components/shared/LocalUploadButton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { AdPreview } from '@/components/admin/ads/AdPreview';
import { useToast } from '@/hooks/use-toast';
import { AdminRequestError, createAdminRecord, updateAdminRecord } from '@/lib/admin/client';
import {
  AD_AUDIENCES,
  AD_AUDIENCE_LABEL,
  AD_BADGES,
  AD_FORMATS,
  AD_FORMAT_LABEL,
  AD_GENDERS,
  AD_GENDER_LABEL,
  AD_LEVELS,
  AD_LEVEL_LABEL,
  AD_LIMITS,
  AD_LINK_PRESETS,
  AD_PLACEMENTS,
  AD_PLACEMENT_LABEL,
  AD_TONES,
  AD_TONE_LABEL,
  adInputSchema,
  type AdAudience,
  type AdBadge,
  type AdData,
  type AdFormat,
  type AdGender,
  type AdLevel,
  type AdPlacement,
  type AdTone,
} from '@/lib/ads';

interface FormState {
  name: string;
  advertiser: string;
  format: AdFormat;
  title: string;
  text: string;
  imageUrl: string;
  ctaLabel: string;
  link: string;
  badge: AdBadge;
  tone: AdTone;
  placements: AdPlacement[];
  audience: AdAudience;
  genders: AdGender[];
  trainingLevels: AdLevel[];
  dismissible: boolean;
  active: boolean;
  startsAt: string;
  endsAt: string;
  weight: string;
  dailyCapPerUser: string;
  maxImpressions: string;
  maxClicks: string;
}

const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

function initialState(ad: AdData | null): FormState {
  return {
    name: ad?.name ?? '',
    advertiser: ad?.advertiser ?? '',
    format: ad?.format ?? 'card',
    title: ad?.title ?? '',
    text: ad?.text ?? '',
    imageUrl: ad?.imageUrl ?? '',
    ctaLabel: ad?.ctaLabel ?? '',
    link: ad?.link ?? '',
    badge: ad?.badge ?? 'Reklama',
    tone: ad?.tone ?? 'neutral',
    placements: ad?.placements ?? [],
    audience: ad?.audience ?? 'all',
    genders: ad?.genders ?? [],
    trainingLevels: ad?.trainingLevels ?? [],
    dismissible: ad?.dismissible ?? true,
    active: ad?.active ?? true,
    startsAt: toLocalInput(ad?.startsAt),
    endsAt: toLocalInput(ad?.endsAt),
    weight: String(ad?.weight ?? 1),
    dailyCapPerUser: String(ad?.dailyCapPerUser ?? 0),
    maxImpressions: String(ad?.maxImpressions ?? 0),
    maxClicks: String(ad?.maxClicks ?? 0),
  };
}

function toggleIn<T>(list: T[], item: T, on: boolean): T[] {
  return on ? [...list.filter((entry) => entry !== item), item] : list.filter((entry) => entry !== item);
}

interface AdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` creates a new ad; an ad without `id` is a copy to be saved as new. */
  ad: AdData | null;
  isCopy?: boolean;
  onSaved: () => void;
}

export function AdDialog({ open, onOpenChange, ad, isCopy = false, onSaved }: AdDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(() => initialState(ad));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(ad) && !isCopy;

  useEffect(() => {
    if (!open) return;
    const next = initialState(ad);
    setForm(isCopy ? { ...next, name: `${next.name} (kopia)`, active: false } : next);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ad?.id, isCopy]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const { [key]: _removed, ...others } = current;
      return others;
    });
  };

  const save = async () => {
    const payload = {
      ...form,
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
    };
    const parsed = adInputSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0] ?? '_')] ??= issue.message;
      setErrors(next);
      toast({ title: 'Popraw formularz', description: Object.values(next)[0], variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Dates go as ISO strings; empty optional texts as null so they are cleared.
      const body: Record<string, unknown> = { ...parsed.data, startsAt: payload.startsAt, endsAt: payload.endsAt };
      for (const key of ['advertiser', 'title', 'text', 'imageUrl', 'ctaLabel', 'link']) body[key] ??= null;

      if (isEdit) await updateAdminRecord('ads', ad!.id, body);
      else await createAdminRecord('ads', body);
      toast({ title: isEdit ? 'Reklama zapisana' : 'Reklama utworzona', description: parsed.data.name });
      onSaved();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof AdminRequestError && error.fields) setErrors(error.fields);
      toast({
        title: 'Nie udało się zapisać',
        description: error instanceof Error ? error.message : 'Spróbuj ponownie.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const errorText = (key: keyof FormState) =>
    errors[key] ? <p className="text-xs font-medium text-destructive">{errors[key]}</p> : null;

  const counter = (value: string, max: number) => (
    <span className="text-xs tabular-nums text-muted-foreground">
      {value.length}/{max}
    </span>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{isEdit ? 'Edytuj reklamę' : isCopy ? 'Powiel reklamę' : 'Nowa reklama'}</DialogTitle>
          <DialogDescription>
            Reklama pojawia się w aplikacji sportowca na wybranych ekranach, w podanym terminie i dla wybranych odbiorców.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Kampania</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ad-name">Nazwa wewnętrzna *</Label>
                  <Input id="ad-name" value={form.name} maxLength={AD_LIMITS.name} onChange={(event) => set('name', event.target.value)} placeholder="np. Odżywki — listopad" />
                  {errorText('name')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ad-advertiser">Reklamodawca</Label>
                  <Input id="ad-advertiser" value={form.advertiser} maxLength={AD_LIMITS.advertiser} onChange={(event) => set('advertiser', event.target.value)} placeholder="Nazwa firmy lub „własna”" />
                  {errorText('advertiser')}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Kreacja</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Format *</Label>
                  <Select value={form.format} onValueChange={(value) => set('format', value as AdFormat)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AD_FORMATS.map((format) => (
                        <SelectItem key={format} value={format}>{AD_FORMAT_LABEL[format]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Oznaczenie</Label>
                  <Select value={form.badge} onValueChange={(value) => set('badge', value as AdBadge)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AD_BADGES.map((badge) => (
                        <SelectItem key={badge} value={badge}>{badge}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Kolor</Label>
                  <Select value={form.tone} onValueChange={(value) => set('tone', value as AdTone)} disabled={form.format === 'banner'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AD_TONES.map((tone) => (
                        <SelectItem key={tone} value={tone}>{AD_TONE_LABEL[tone]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Obraz{form.format === 'banner' ? ' *' : ''}</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input value={form.imageUrl} onChange={(event) => set('imageUrl', event.target.value)} placeholder="Prześlij plik albo wklej adres https://…" />
                  <LocalUploadButton
                    label="Prześlij"
                    onComplete={(files) => files[0] && set('imageUrl', files[0].url)}
                    onError={(error) => toast({ title: 'Nie udało się przesłać obrazu', description: error.message, variant: 'destructive' })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {form.format === 'banner'
                    ? 'Baner to sam obraz w proporcji ok. 16:7 — tekst umieść na grafice.'
                    : form.format === 'card'
                      ? 'Opcjonalny obraz nad tekstem, proporcja ok. 2:1.'
                      : 'Opcjonalna kwadratowa miniatura.'}
                </p>
                {errorText('imageUrl')}
              </div>

              {form.format !== 'banner' && (
                <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ad-title">Tytuł *</Label>
                      {counter(form.title, AD_LIMITS.title)}
                    </div>
                    <Input id="ad-title" value={form.title} maxLength={AD_LIMITS.title} onChange={(event) => set('title', event.target.value)} />
                    {errorText('title')}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ad-text">Opis</Label>
                      {counter(form.text, AD_LIMITS.text)}
                    </div>
                    <Textarea id="ad-text" rows={2} value={form.text} maxLength={AD_LIMITS.text} onChange={(event) => set('text', event.target.value)} />
                    {errorText('text')}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ad-cta">Tekst przycisku</Label>
                      {counter(form.ctaLabel, AD_LIMITS.ctaLabel)}
                    </div>
                    <Input id="ad-cta" value={form.ctaLabel} maxLength={AD_LIMITS.ctaLabel} onChange={(event) => set('ctaLabel', event.target.value)} placeholder="np. Sprawdź" className="max-w-xs" />
                    {errorText('ctaLabel')}
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="ad-link">Link po kliknięciu</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input id="ad-link" value={form.link} onChange={(event) => set('link', event.target.value)} placeholder="https://… albo /athlete/…" />
                  <Select value="" onValueChange={(value) => set('link', value)}>
                    <SelectTrigger className="sm:w-48"><SelectValue placeholder="Ekran aplikacji…" /></SelectTrigger>
                    <SelectContent>
                      {AD_LINK_PRESETS.map((preset) => (
                        <SelectItem key={preset.href} value={preset.href}>{preset.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">Bez linku reklama jest tylko informacją — kliknięcia nie są wtedy liczone.</p>
                {errorText('link')}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Gdzie wyświetlać *</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {AD_PLACEMENTS.map((placement) => (
                  <label key={placement} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.placements.includes(placement)}
                      onCheckedChange={(checked) => set('placements', toggleIn(form.placements, placement, Boolean(checked)))}
                    />
                    {AD_PLACEMENT_LABEL[placement]}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => set('placements', [...AD_PLACEMENTS])}>Zaznacz wszystkie</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => set('placements', [])}>Wyczyść</Button>
              </div>
              {errorText('placements')}
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Odbiorcy</h3>
              <div className="space-y-1.5">
                <Label>Kto widzi reklamę</Label>
                <Select value={form.audience} onValueChange={(value) => set('audience', value as AdAudience)}>
                  <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AD_AUDIENCES.map((audience) => (
                      <SelectItem key={audience} value={audience}>{AD_AUDIENCE_LABEL[audience]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Płeć</Label>
                  {AD_GENDERS.map((gender) => (
                    <label key={gender} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.genders.includes(gender)} onCheckedChange={(checked) => set('genders', toggleIn(form.genders, gender, Boolean(checked)))} />
                      {AD_GENDER_LABEL[gender]}
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Poziom zaawansowania</Label>
                  {AD_LEVELS.map((level) => (
                    <label key={level} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.trainingLevels.includes(level)} onCheckedChange={(checked) => set('trainingLevels', toggleIn(form.trainingLevels, level, Boolean(checked)))} />
                      {AD_LEVEL_LABEL[level]}
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Nic nie zaznaczone = wszyscy. Zawężenie pomija osoby, które nie podały tej informacji w profilu (m.in. gości).
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Harmonogram i limity</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ad-start">Początek</Label>
                  <Input id="ad-start" type="datetime-local" value={form.startsAt} onChange={(event) => set('startsAt', event.target.value)} />
                  {errorText('startsAt')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ad-end">Koniec</Label>
                  <Input id="ad-end" type="datetime-local" value={form.endsAt} onChange={(event) => set('endsAt', event.target.value)} />
                  {errorText('endsAt')}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ad-weight">Waga (1–100)</Label>
                  <Input id="ad-weight" type="number" min={1} max={100} value={form.weight} onChange={(event) => set('weight', event.target.value)} />
                  <p className="text-xs text-muted-foreground">Gdy o jedno miejsce konkuruje kilka reklam, waga 2 wyświetla się dwa razy częściej niż 1.</p>
                  {errorText('weight')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ad-cap">Limit dzienny na osobę</Label>
                  <Input id="ad-cap" type="number" min={0} value={form.dailyCapPerUser} onChange={(event) => set('dailyCapPerUser', event.target.value)} />
                  <p className="text-xs text-muted-foreground">Ile razy dziennie jedna osoba zobaczy reklamę. 0 = bez limitu.</p>
                  {errorText('dailyCapPerUser')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ad-max-impressions">Limit wyświetleń (łącznie)</Label>
                  <Input id="ad-max-impressions" type="number" min={0} value={form.maxImpressions} onChange={(event) => set('maxImpressions', event.target.value)} />
                  {errorText('maxImpressions')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ad-max-clicks">Limit kliknięć (łącznie)</Label>
                  <Input id="ad-max-clicks" type="number" min={0} value={form.maxClicks} onChange={(event) => set('maxClicks', event.target.value)} />
                  {errorText('maxClicks')}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Limity łączne: po ich osiągnięciu reklama przestaje się wyświetlać. 0 = bez limitu.</p>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="ad-dismissible">Można zamknąć</Label>
                  <p className="text-xs text-muted-foreground">Zamknięta reklama nie wraca na tym urządzeniu.</p>
                </div>
                <Switch id="ad-dismissible" checked={form.dismissible} onCheckedChange={(checked) => set('dismissible', checked)} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label htmlFor="ad-active">Włączona</Label>
                  <p className="text-xs text-muted-foreground">Wyłączona reklama nie wyświetla się niezależnie od terminu.</p>
                </div>
                <Switch id="ad-active" checked={form.active} onCheckedChange={(checked) => set('active', checked)} />
              </div>
            </section>
          </div>

          <aside className="space-y-2 lg:sticky lg:top-0 lg:self-start">
            <h3 className="text-sm font-semibold text-muted-foreground">Podgląd w aplikacji</h3>
            <AdPreview
              ad={{
                format: form.format,
                title: form.title,
                text: form.text,
                imageUrl: form.imageUrl,
                ctaLabel: form.ctaLabel,
                badge: form.badge,
                tone: form.tone,
                dismissible: form.dismissible,
              }}
            />
            <p className="text-center text-xs text-muted-foreground">Podgląd poglądowy — kroje pisma w aplikacji mogą się nieznacznie różnić.</p>
          </aside>
        </div>

        <DialogFooter className="border-t px-6 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Anuluj</Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Zapisz zmiany' : 'Utwórz reklamę'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
