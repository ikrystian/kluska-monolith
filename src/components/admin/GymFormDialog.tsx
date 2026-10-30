'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Globe, ImagePlus, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateDoc, useUpdateDoc } from '@/lib/db-hooks';
import { EMPTY_GYM_FORM, gymFormToPayload, gymSchema, gymToFormValues, type GymFormValues } from '@/lib/gym-form';
import { resolveStoredImageUrl, uploadClientFiles } from '@/lib/upload';
import { useToast } from '@/hooks/use-toast';
import type { Gym } from '@/lib/types';

interface GymFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edytowana siłownia; `null` = nowa. */
  gym: Gym | null;
  onSaved: () => void;
}

type TextFieldName = Exclude<keyof GymFormValues, 'description' | 'amenities' | 'photoUrls' | 'logoUrl'>;

function TextField({
  control,
  name,
  label,
  description,
  ...input
}: {
  control: Control<GymFormValues>;
  name: TextFieldName;
  label: string;
  description?: string;
} & Omit<React.ComponentProps<typeof Input>, 'name' | 'value' | 'onChange' | 'onBlur' | 'ref'>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...input} {...field} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

/** Podgląd logo; gdy plik się nie wczyta, zostaje ikona zastępcza. */
function LogoPreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const src = url.trim() ? resolveStoredImageUrl(url.trim()) : '';

  return (
    <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border bg-muted">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-contain" onError={() => setFailed(true)} />
      ) : (
        <Building2 className="h-6 w-6 text-muted-foreground" />
      )}
    </span>
  );
}

export function GymFormDialog({ open, onOpenChange, gym, onSaved }: GymFormDialogProps) {
  const { toast } = useToast();
  const { createDoc, isLoading: isCreating } = useCreateDoc();
  const { updateDoc, isLoading: isUpdating } = useUpdateDoc();
  const [isUploadingLogo, setUploadingLogo] = useState(false);
  const [isUploadingPhotos, setUploadingPhotos] = useState(false);
  const [isFindingLogo, setFindingLogo] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const photosInput = useRef<HTMLInputElement>(null);

  const form = useForm<GymFormValues>({
    resolver: zodResolver(gymSchema),
    defaultValues: EMPTY_GYM_FORM,
  });

  // Każde otwarcie zaczyna od aktualnych danych wybranej siłowni (albo pustego formularza).
  useEffect(() => {
    if (open) form.reset(gymToFormValues(gym));
  }, [open, gym, form]);

  const isSaving = isCreating || isUpdating;
  const logoUrl = form.watch('logoUrl');

  const onSubmit = async (values: GymFormValues) => {
    const payload = gymFormToPayload(values, !!gym);
    try {
      if (gym) {
        await updateDoc('gyms', gym.id || (gym as Gym & { _id?: string })._id!, payload);
        toast({ title: 'Sukces!', description: 'Dane siłowni zostały zaktualizowane.' });
      } else {
        await createDoc('gyms', payload);
        toast({ title: 'Sukces!', description: 'Nowa siłownia została dodana.' });
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Błąd!',
        description: 'Nie udało się zapisać siłowni. Sprawdź, czy CID nie należy już do innej siłowni.',
        variant: 'destructive',
      });
    }
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const [uploaded] = await uploadClientFiles([file]);
      form.setValue('logoUrl', uploaded.url, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      toast({ title: 'Błąd przesyłania', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
      if (logoInput.current) logoInput.current.value = '';
    }
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingPhotos(true);
    try {
      const uploaded = await uploadClientFiles([...files]);
      const current = form.getValues('photoUrls').trim();
      form.setValue('photoUrls', [current, ...uploaded.map(file => file.url)].filter(Boolean).join('\n'), {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (error) {
      toast({ title: 'Błąd przesyłania', description: error instanceof Error ? error.message : undefined, variant: 'destructive' });
    } finally {
      setUploadingPhotos(false);
      if (photosInput.current) photosInput.current.value = '';
    }
  };

  const findLogoOnWebsite = async () => {
    const website = form.getValues('website').trim();
    if (!website) return;
    setFindingLogo(true);
    try {
      const response = await fetch('/api/admin/gyms/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { logoUrl: found } = (await response.json()) as { logoUrl: string | null };
      if (found) {
        form.setValue('logoUrl', found, { shouldDirty: true, shouldValidate: true });
      } else {
        toast({ title: 'Nie znaleziono logo', description: 'Strona nie udostępnia użytecznej ikony. Prześlij plik ręcznie.' });
      }
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się pobrać logo ze strony.', variant: 'destructive' });
    } finally {
      setFindingLogo(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{gym ? 'Edytuj siłownię' : 'Dodaj nową siłownię'}</DialogTitle>
          <DialogDescription>Poza nazwą i adresem wszystkie pola są opcjonalne.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Section title="Podstawowe">
              <TextField control={form.control} name="name" label="Nazwa siłowni" />
              <TextField control={form.control} name="address" label="Adres" />
            </Section>

            <Section title="Pozycja na mapie">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField control={form.control} name="lat" label="Szerokość geograficzna" inputMode="decimal" placeholder="np. 51.263428" />
                <TextField control={form.control} name="lng" label="Długość geograficzna" inputMode="decimal" placeholder="np. 22.570957" />
              </div>
              <p className="text-xs text-muted-foreground">Bez współrzędnych aplikacja ustali położenie na podstawie adresu.</p>
            </Section>

            <Section title="Ocena i kontakt">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField control={form.control} name="rating" label="Ocena (0–5)" inputMode="decimal" placeholder="np. 4.6" />
                <TextField control={form.control} name="ratingCount" label="Liczba ocen" inputMode="numeric" placeholder="np. 120" />
                <TextField control={form.control} name="phoneNumber" label="Telefon" type="tel" />
                <TextField control={form.control} name="website" label="Strona www" placeholder="https://" />
              </div>
            </Section>

            <Section title="Logo">
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-3">
                      <LogoPreview key={logoUrl} url={logoUrl} />
                      <div className="min-w-0 flex-1 space-y-2">
                        <FormControl>
                          <Input placeholder="/upload-data/… albo https://…" {...field} />
                        </FormControl>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" disabled={isUploadingLogo} onClick={() => logoInput.current?.click()}>
                            {isUploadingLogo ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
                            Prześlij plik
                          </Button>
                          <Button type="button" variant="outline" size="sm" disabled={isFindingLogo || !form.watch('website').trim()} onClick={findLogoOnWebsite}>
                            {isFindingLogo ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Globe className="mr-2 h-3 w-3" />}
                            Pobierz ze strony www
                          </Button>
                          {logoUrl && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => form.setValue('logoUrl', '', { shouldDirty: true })}>
                              <X className="mr-2 h-3 w-3" />
                              Usuń
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <FormMessage />
                    <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={e => uploadLogo(e.target.files?.[0])} />
                  </FormItem>
                )}
              />
            </Section>

            <Section title="Opis i udogodnienia">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opis</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amenities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Udogodnienia</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder={'sauna\nparking\nstrefa cardio'} {...field} />
                    </FormControl>
                    <FormDescription>Jedno w linii albo po przecinku.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Section>

            <Section title="Zdjęcia">
              <FormField
                control={form.control}
                name="photoUrls"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea rows={3} placeholder={'/upload-data/…\nhttps://…'} {...field} />
                    </FormControl>
                    <FormDescription>Każde zdjęcie w osobnej linii: ścieżka pliku albo adres http(s).</FormDescription>
                    <FormMessage />
                    <Button type="button" variant="outline" size="sm" disabled={isUploadingPhotos} onClick={() => photosInput.current?.click()}>
                      {isUploadingPhotos ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <ImagePlus className="mr-2 h-3 w-3" />}
                      Prześlij zdjęcia
                    </Button>
                    <input ref={photosInput} type="file" accept="image/*" multiple className="hidden" onChange={e => uploadPhotos(e.target.files)} />
                  </FormItem>
                )}
              />
            </Section>

            <Section title="Dane z importu">
              <TextField
                control={form.control}
                name="cid"
                label="CID (Google Maps)"
                description="Identyfikator z importu; chroni przed duplikatami. Raz zapisanego CID nie można usunąć."
              />
            </Section>

            <DialogFooter>
              <Button type="button" variant="secondary" disabled={isSaving} onClick={() => onOpenChange(false)}>
                Anuluj
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
