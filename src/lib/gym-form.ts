import { z } from 'zod';
import type { Gym } from '@/lib/types';

/**
 * Formularz siłowni w panelu admina.
 *
 * Wszystkie pola formularza są tekstem (tak działają inputy), a schemat tylko
 * je waliduje — bez transformacji, żeby typ wejścia i wyjścia zgadzały się dla
 * `react-hook-form`. Zamiana na dokument siłowni jest w `gymFormToPayload`.
 */

const toNumber = (value: string) => Number(value.replace(',', '.'));
const isBlank = (value: string) => value.trim() === '';

/** Puste pole albo liczba z zakresu. */
const numberField = (message: string, { min, max, integer = false }: { min: number; max: number; integer?: boolean }) =>
  z.string().refine(value => {
    if (isBlank(value)) return true;
    const n = toNumber(value);
    return Number.isFinite(n) && n >= min && n <= max && (!integer || Number.isInteger(n));
  }, message);

const isHttpUrl = (value: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

/** Logo i zdjęcia: własny plik (`/upload-data/...`) albo adres http(s). */
const isImageRef = (value: string) => value.startsWith('/') || isHttpUrl(value);

const splitLines = (value: string, separators: RegExp) =>
  [...new Set(value.split(separators).map(item => item.trim()).filter(Boolean))];

export const gymSchema = z
  .object({
    name: z.string().trim().min(1, 'Nazwa jest wymagana.'),
    address: z.string().trim().min(1, 'Adres jest wymagany.'),
    lat: numberField('Szerokość geograficzna: liczba od -90 do 90.', { min: -90, max: 90 }),
    lng: numberField('Długość geograficzna: liczba od -180 do 180.', { min: -180, max: 180 }),
    rating: numberField('Ocena: liczba od 0 do 5.', { min: 0, max: 5 }),
    ratingCount: numberField('Liczba ocen: liczba całkowita, co najmniej 0.', { min: 0, max: 1e9, integer: true }),
    phoneNumber: z.string(),
    website: z.string().refine(value => isBlank(value) || isHttpUrl(value.trim()), 'Podaj pełny adres, np. https://example.pl'),
    cid: z.string(),
    description: z.string(),
    amenities: z.string(),
    logoUrl: z.string().refine(value => isBlank(value) || isImageRef(value.trim()), 'Podaj ścieżkę pliku albo adres http(s).'),
    photoUrls: z
      .string()
      .refine(value => splitLines(value, /\n/).every(isImageRef), 'Każde zdjęcie w osobnej linii: ścieżka pliku albo adres http(s).'),
  })
  .superRefine((value, ctx) => {
    // Pozycja ma sens tylko jako para; sama połowa zostawiłaby siłownię bez punktu na mapie.
    if (isBlank(value.lat) !== isBlank(value.lng)) {
      ctx.addIssue({
        code: 'custom',
        path: [isBlank(value.lat) ? 'lat' : 'lng'],
        message: 'Podaj obie współrzędne albo żadnej.',
      });
    }
  });

export type GymFormValues = z.infer<typeof gymSchema>;

export const EMPTY_GYM_FORM: GymFormValues = {
  name: '',
  address: '',
  lat: '',
  lng: '',
  rating: '',
  ratingCount: '',
  phoneNumber: '',
  website: '',
  cid: '',
  description: '',
  amenities: '',
  logoUrl: '',
  photoUrls: '',
};

export function gymToFormValues(gym: Gym | null | undefined): GymFormValues {
  if (!gym) return { ...EMPTY_GYM_FORM };
  const num = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));
  return {
    name: gym.name ?? '',
    address: gym.address ?? '',
    lat: num(gym.location?.lat),
    lng: num(gym.location?.lng),
    rating: num(gym.rating),
    ratingCount: num(gym.ratingCount),
    phoneNumber: gym.phoneNumber ?? '',
    website: gym.website ?? '',
    cid: gym.cid ?? '',
    description: gym.description ?? '',
    amenities: (gym.amenities ?? []).join('\n'),
    logoUrl: gym.logoUrl ?? '',
    photoUrls: (gym.photoUrls ?? []).join('\n'),
  };
}

/**
 * Dokument siłowni do zapisu.
 *
 * Przy edycji puste pole musi wyczyścić wartość w bazie, więc idzie jako `null`
 * (liczby) albo pusty tekst; przy tworzeniu pola puste są pomijane. Wyjątek to
 * `cid`: ma unikalny indeks, a API nie pozwala usunąć pola, więc pusty CID nigdy
 * nie jest wysyłany (zostaje, jaki był).
 */
export function gymFormToPayload(values: GymFormValues, isEdit: boolean) {
  const number = (value: string) => (isBlank(value) ? (isEdit ? null : undefined) : toNumber(value));
  const text = (value: string) => (isBlank(value) ? (isEdit ? '' : undefined) : value.trim());
  const hasPosition = !isBlank(values.lat) && !isBlank(values.lng);

  return {
    name: values.name.trim(),
    address: values.address.trim(),
    location: hasPosition
      ? { lat: toNumber(values.lat), lng: toNumber(values.lng) }
      : isEdit
        ? { lat: null, lng: null }
        : undefined,
    rating: number(values.rating),
    ratingCount: number(values.ratingCount),
    phoneNumber: text(values.phoneNumber),
    website: text(values.website),
    cid: isBlank(values.cid) ? undefined : values.cid.trim(),
    description: text(values.description),
    logoUrl: text(values.logoUrl),
    amenities: splitLines(values.amenities, /[\n,]/),
    photoUrls: splitLines(values.photoUrls, /\n/),
  };
}
