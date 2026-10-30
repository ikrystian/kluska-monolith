'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Circle, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocalUploadButton } from '@/components/shared/LocalUploadButton';
import { AvatarUploadDialog } from '@/components/profile/AvatarUploadDialog';
import { useDoc, useUser, useUpdateDoc } from '@/lib/db-hooks';
import { resolveStoredImageUrl } from '@/lib/upload';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';

const MAX_GALLERY = 8;
const MAX_TAGS = 8;
const MAX_ACHIEVEMENTS = 6;

const cardSchema = z.object({
  published: z.boolean(),
  headline: z.string().max(100, 'Maksymalnie 100 znaków.'),
  bio: z.string().max(1500, 'Maksymalnie 1500 znaków.'),
  coverImageUrl: z.string(),
  specializations: z.array(z.string()).max(MAX_TAGS),
  languages: z.array(z.string()).max(MAX_TAGS),
  experienceYears: z.string().regex(/^\d{0,2}$/, 'Podaj liczbę lat (0-80).'),
  cooperationMode: z.enum(['gym', 'online', 'both']),
  availability: z.enum(['open', 'limited', 'closed']),
  responseTime: z.enum(['hour', 'day', 'few_days']),
  achievements: z.array(z.string()).max(MAX_ACHIEVEMENTS),
  faq: z.array(z.object({ question: z.string().min(1, 'Podaj pytanie.').max(140), answer: z.string().min(1, 'Podaj odpowiedź.').max(600) })),
  ctaText: z.string().max(40, 'Maksymalnie 40 znaków.'),
  certifications: z.array(z.object({ name: z.string().min(1, 'Podaj nazwę.'), year: z.string().regex(/^(\d{4})?$/, 'Rok w formacie RRRR.') })),
  services: z.array(
    z.object({
      title: z.string().min(1, 'Podaj nazwę usługi.').max(80),
      description: z.string().max(400),
      price: z.string().max(60),
      highlighted: z.boolean(),
    })
  ),
  testimonials: z.array(z.object({ author: z.string().min(1, 'Podaj autora.').max(60), text: z.string().min(1, 'Podaj treść.').max(500) })),
  gallery: z.array(z.string()).max(MAX_GALLERY),
});

type CardValues = z.infer<typeof cardSchema>;

function TagInput({
  value,
  onChange,
  placeholder,
  max = MAX_TAGS,
  maxLength = 40,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  max?: number;
  maxLength?: number;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const tag = draft.trim();
    if (tag && !value.includes(tag) && value.length < max) onChange([...value, tag]);
    setDraft('');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add} disabled={value.length >= max}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button type="button" aria-label={`Usuń ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

const CHECKLIST: { label: string; done: (v: CardValues, hasAvatar: boolean) => boolean }[] = [
  { label: 'Dodaj zdjęcie profilowe', done: (_, hasAvatar) => hasAvatar },
  { label: 'Dodaj zdjęcie w tle', done: (v) => !!v.coverImageUrl },
  { label: 'Wpisz chwytliwe hasło', done: (v) => v.headline.trim().length >= 10 },
  { label: 'Napisz „O mnie” (min. 100 znaków)', done: (v) => v.bio.trim().length >= 100 },
  { label: 'Wybierz specjalizacje', done: (v) => v.specializations.length > 0 },
  { label: 'Dodaj ofertę z cenami', done: (v) => v.services.some((s) => s.title.trim()) },
  { label: 'Dodaj certyfikaty', done: (v) => v.certifications.some((c) => c.name.trim()) },
  { label: 'Dodaj min. 3 zdjęcia do galerii', done: (v) => v.gallery.length >= 3 },
  { label: 'Dodaj opinię podopiecznego', done: (v) => v.testimonials.some((t) => t.text.trim()) },
  { label: 'Odpowiedz na częste pytania', done: (v) => v.faq.some((f) => f.question.trim() && f.answer.trim()) },
];

function Completeness({ values, hasAvatar }: { values: CardValues; hasAvatar: boolean }) {
  const results = CHECKLIST.map((item) => ({ ...item, ok: item.done(values, hasAvatar) }));
  const done = results.filter((r) => r.ok).length;
  const percent = Math.round((done / results.length) * 100);
  const missing = results.filter((r) => !r.ok);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-baseline justify-between">
          <span>Kompletność wizytówki</span>
          <span className="text-2xl font-bold text-primary">{percent}%</span>
        </CardTitle>
        <CardDescription>
          {missing.length === 0
            ? 'Świetnie — wizytówka jest kompletna. Pełne profile wzbudzają największe zaufanie.'
            : 'Im pełniejszy profil, tym chętniej sportowcy do Ciebie napiszą.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={percent} />
        {missing.length > 0 && (
          <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
            {missing.map((m) => (
              <li key={m.label} className="flex items-center gap-2 text-muted-foreground">
                <Circle className="h-3.5 w-3.5 shrink-0" /> {m.label}
              </li>
            ))}
          </ul>
        )}
        {missing.length === 0 && (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Wszystko uzupełnione
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function BusinessCardForm() {
  const { toast } = useToast();
  const { user } = useUser();
  const { data: profile, isLoading, refetch } = useDoc<UserProfile>('users', user?.uid || null);
  const { updateDoc } = useUpdateDoc();
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const card = profile?.trainerCard;

  const form = useForm<CardValues>({
    resolver: zodResolver(cardSchema),
    values: {
      published: card?.published ?? false,
      headline: card?.headline ?? '',
      bio: card?.bio ?? '',
      coverImageUrl: card?.coverImageUrl ?? '',
      specializations: card?.specializations ?? [],
      languages: card?.languages ?? [],
      experienceYears: card?.experienceYears != null ? String(card.experienceYears) : '',
      cooperationMode: card?.cooperationMode ?? 'both',
      availability: card?.availability ?? 'open',
      responseTime: card?.responseTime ?? 'day',
      achievements: card?.achievements ?? [],
      faq: card?.faq ?? [],
      ctaText: card?.ctaText ?? '',
      certifications: (card?.certifications ?? []).map((c) => ({ name: c.name, year: c.year ? String(c.year) : '' })),
      services: (card?.services ?? []).map((s) => ({ title: s.title, description: s.description ?? '', price: s.price ?? '', highlighted: !!s.highlighted })),
      testimonials: card?.testimonials ?? [],
      gallery: card?.gallery ?? [],
    },
  });

  const certs = useFieldArray({ control: form.control, name: 'certifications' });
  const services = useFieldArray({ control: form.control, name: 'services' });
  const testimonials = useFieldArray({ control: form.control, name: 'testimonials' });
  const faq = useFieldArray({ control: form.control, name: 'faq' });

  const watched = form.watch();
  const cover = watched.coverImageUrl;
  const gallery = watched.gallery;

  const onSubmit = async (v: CardValues) => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      const trainerCard = {
        published: v.published,
        headline: v.headline.trim(),
        bio: v.bio.trim(),
        coverImageUrl: v.coverImageUrl || undefined,
        specializations: v.specializations,
        languages: v.languages,
        experienceYears: v.experienceYears ? Number(v.experienceYears) : undefined,
        cooperationMode: v.cooperationMode,
        availability: v.availability,
        responseTime: v.responseTime,
        achievements: v.achievements,
        faq: v.faq.map((f) => ({ question: f.question.trim(), answer: f.answer.trim() })),
        ctaText: v.ctaText.trim(),
        certifications: v.certifications.map((c) => ({ name: c.name.trim(), year: c.year ? Number(c.year) : undefined })),
        services: v.services.map((s) => ({ title: s.title.trim(), description: s.description.trim(), price: s.price.trim(), highlighted: s.highlighted })),
        testimonials: v.testimonials.map((t) => ({ author: t.author.trim(), text: t.text.trim() })),
        gallery: v.gallery,
      };
      await updateDoc('users', user.uid, { ...profile, trainerCard });
      await refetch();
      toast({ title: 'Zapisano', description: v.published ? 'Wizytówka jest widoczna dla sportowców.' : 'Wizytówka zapisana jako szkic.' });
    } catch (error) {
      toast({
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się zapisać wizytówki.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-headline text-3xl font-bold">Wizytówka</h1>
          <p className="text-muted-foreground">
            Zaprezentuj się sportowcom. Sportowcy zobaczą ją w Twoim profilu trenera, zanim do Ciebie napiszą.
          </p>
        </div>

        <Completeness values={watched} hasAvatar={!!profile?.avatarUrl} />

        <Card>
          <CardContent className="flex items-center justify-between gap-4 pt-6">
            <div>
              <p className="font-semibold">Opublikuj wizytówkę</p>
              <p className="text-sm text-muted-foreground">Wyłączona wizytówka jest szkicem — sportowcy jej nie widzą.</p>
            </div>
            <FormField
              control={form.control}
              name="published"
              render={({ field }) => (
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Opublikuj wizytówkę" />
                </FormControl>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wizerunek</CardTitle>
            <CardDescription>Zdjęcie w tle (16:9) i chwytliwe hasło — to widać jako pierwsze.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {cover ? (
                <div className="relative aspect-video overflow-hidden rounded-lg border">
                  <img src={resolveStoredImageUrl(cover)} alt="Okładka wizytówki" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="grid aspect-video place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  Brak zdjęcia w tle
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setCoverDialogOpen(true)}>
                  <ImagePlus className="mr-2 h-4 w-4" /> {cover ? 'Zmień zdjęcie' : 'Dodaj zdjęcie'}
                </Button>
                {cover && (
                  <Button type="button" variant="ghost" onClick={() => form.setValue('coverImageUrl', '', { shouldDirty: true })}>
                    Usuń
                  </Button>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="headline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hasło</FormLabel>
                  <FormControl>
                    <Input placeholder="np. Zbuduję Twoją formę — krok po kroku" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>O mnie</FormLabel>
                  <FormControl>
                    <Textarea rows={6} placeholder="Opowiedz, kim jesteś, jak pracujesz i dla kogo jest Twój trening." {...field} />
                  </FormControl>
                  <FormDescription>{field.value.length}/1500</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Szybkie fakty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="experienceYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lata doświadczenia</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" placeholder="np. 8" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cooperationMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma współpracy</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gym">Stacjonarnie</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="both">Stacjonarnie i online</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dostępność</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open">Przyjmuję nowych podopiecznych</SelectItem>
                        <SelectItem value="limited">Ostatnie wolne miejsca</SelectItem>
                        <SelectItem value="closed">Chwilowo brak miejsc</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responseTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zwykle odpowiadam</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hour">w ciągu godziny</SelectItem>
                        <SelectItem value="day">w ciągu 24 godzin</SelectItem>
                        <SelectItem value="few_days">w ciągu 2–3 dni</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="achievements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Osiągnięcia</FormLabel>
                  <TagInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="np. 120+ przemian sylwetki — Enter dodaje"
                    max={MAX_ACHIEVEMENTS}
                    maxLength={80}
                  />
                  <FormDescription>Do {MAX_ACHIEVEMENTS} krótkich haseł, które widać tuż pod nagłówkiem.</FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="specializations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specjalizacje</FormLabel>
                  <TagInput value={field.value} onChange={field.onChange} placeholder="np. Redukcja, Siła — Enter dodaje" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="languages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Języki</FormLabel>
                  <TagInput value={field.value} onChange={field.onChange} placeholder="np. polski, angielski" />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Certyfikaty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {certs.fields.map((f, i) => (
              <div key={f.id} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`certifications.${i}.name`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Nazwa certyfikatu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`certifications.${i}.year`}
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <FormControl>
                        <Input inputMode="numeric" placeholder="Rok" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="ghost" size="icon" aria-label="Usuń certyfikat" onClick={() => certs.remove(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => certs.append({ name: '', year: '' })}>
              <Plus className="mr-2 h-4 w-4" /> Dodaj certyfikat
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Oferta</CardTitle>
            <CardDescription>Co oferujesz i za ile — konkretna oferta zachęca do kontaktu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {services.fields.map((f, i) => (
              <div key={f.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`services.${i}.title`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Nazwa usługi, np. Prowadzenie online" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`services.${i}.price`}
                    render={({ field }) => (
                      <FormItem className="w-36">
                        <FormControl>
                          <Input placeholder="np. od 299 zł/mc" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" aria-label="Usuń usługę" onClick={() => services.remove(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name={`services.${i}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea rows={2} placeholder="Krótki opis, co dostaje klient" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`services.${i}.highlighted`}
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(on) => {
                            // Only one package can carry the "Polecany" ribbon.
                            services.fields.forEach((_, j) => form.setValue(`services.${j}.highlighted`, on && j === i, { shouldDirty: true }));
                          }}
                          aria-label="Wyróżnij pakiet"
                        />
                      </FormControl>
                      <FormLabel className="font-normal text-muted-foreground">Wyróżnij jako „Polecany”</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => services.append({ title: '', description: '', price: '', highlighted: false })}>
              <Plus className="mr-2 h-4 w-4" /> Dodaj usługę
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Galeria</CardTitle>
            <CardDescription>Do {MAX_GALLERY} zdjęć — treningi, efekty, miejsce pracy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {gallery.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {gallery.map((url) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-lg border">
                    <img src={resolveStoredImageUrl(url)} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label="Usuń zdjęcie"
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
                      onClick={() => form.setValue('gallery', gallery.filter((u) => u !== url), { shouldDirty: true })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {gallery.length < MAX_GALLERY && (
              <LocalUploadButton
                multiple
                dropzone
                label="Dodaj zdjęcia"
                onComplete={(files) =>
                  form.setValue('gallery', [...gallery, ...files.map((f) => f.url)].slice(0, MAX_GALLERY), { shouldDirty: true })
                }
                onError={(e) => toast({ title: 'Błąd przesyłania', description: e.message, variant: 'destructive' })}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opinie podopiecznych</CardTitle>
            <CardDescription>Wpisuj wyłącznie prawdziwe opinie, za zgodą autora.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {testimonials.fields.map((f, i) => (
              <div key={f.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`testimonials.${i}.author`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Autor, np. Anna, 32 lata" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" aria-label="Usuń opinię" onClick={() => testimonials.remove(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name={`testimonials.${i}.text`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea rows={3} placeholder="Treść opinii" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => testimonials.append({ author: '', text: '' })}>
              <Plus className="mr-2 h-4 w-4" /> Dodaj opinię
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Częste pytania</CardTitle>
            <CardDescription>Odpowiedz z góry na wątpliwości, które powstrzymują od kontaktu: rozliczenia, sprzęt, pierwszy krok.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {faq.fields.map((f, i) => (
              <div key={f.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`faq.${i}.question`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input placeholder="Pytanie, np. Czy muszę mieć karnet na siłownię?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" aria-label="Usuń pytanie" onClick={() => faq.remove(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name={`faq.${i}.answer`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea rows={3} placeholder="Odpowiedź" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => faq.append({ question: '', answer: '' })} disabled={faq.fields.length >= 8}>
              <Plus className="mr-2 h-4 w-4" /> Dodaj pytanie
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zachęta do kontaktu</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="ctaText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tekst przycisku</FormLabel>
                  <FormControl>
                    <Input placeholder="Nawiąż współpracę" {...field} />
                  </FormControl>
                  <FormDescription>Zostaw puste, aby użyć „Nawiąż współpracę”.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="sticky bottom-4 flex justify-end">
          <Button type="submit" size="lg" disabled={saving} className="shadow-lg">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zapisz wizytówkę
          </Button>
        </div>

        <AvatarUploadDialog
          open={coverDialogOpen}
          onOpenChange={setCoverDialogOpen}
          onUploadComplete={(url) => form.setValue('coverImageUrl', url, { shouldDirty: true })}
          currentAvatarUrl={cover ? resolveStoredImageUrl(cover) : undefined}
          aspect={16 / 9}
          title="Zdjęcie w tle wizytówki"
          submitLabel="Zapisz zdjęcie"
        />
      </form>
    </Form>
  );
}
