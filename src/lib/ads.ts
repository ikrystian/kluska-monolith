import { z } from 'zod';

/**
 * Ads shown inside the athlete app: an admin defines a creative, picks the
 * screens (placements) it may appear on, a schedule and an audience, and the
 * app rotates the live ones in `<AdSlot placement="…">`.
 *
 * This file is safe to import from client components (no database access).
 * The home screen's top strip is a separate module (`dashboard-promos`).
 */

export const AD_FORMATS = ['banner', 'card', 'native'] as const;
export type AdFormat = (typeof AD_FORMATS)[number];

export const AD_FORMAT_LABEL: Record<AdFormat, string> = {
  banner: 'Baner (sam obraz)',
  card: 'Karta (obraz + tekst + przycisk)',
  native: 'Natywna (wiersz z tekstem)',
};

/** Screens of the athlete app that render an ad slot. */
export const AD_PLACEMENTS = [
  'knowledge',
  'article',
  'history',
  'running',
  'nutrition',
  'social',
  'exercises',
  'gamification',
  'menu',
] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const AD_PLACEMENT_LABEL: Record<AdPlacement, string> = {
  knowledge: 'Baza wiedzy — lista artykułów',
  article: 'Artykuł — pod treścią',
  history: 'Historia treningów',
  running: 'Bieganie',
  nutrition: 'Jedzenie',
  social: 'Ekipa (społeczność)',
  exercises: 'Atlas ćwiczeń',
  gamification: 'Nagrody i poziomy',
  menu: 'Menu',
};

export const AD_AUDIENCES = ['all', 'accounts', 'guests'] as const;
export type AdAudience = (typeof AD_AUDIENCES)[number];

export const AD_AUDIENCE_LABEL: Record<AdAudience, string> = {
  all: 'Wszyscy',
  accounts: 'Tylko zarejestrowani',
  guests: 'Tylko goście',
};

export const AD_GENDERS = ['male', 'female', 'other'] as const;
export type AdGender = (typeof AD_GENDERS)[number];
export const AD_GENDER_LABEL: Record<AdGender, string> = {
  male: 'Mężczyźni',
  female: 'Kobiety',
  other: 'Inna / nie podano',
};

export const AD_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type AdLevel = (typeof AD_LEVELS)[number];
export const AD_LEVEL_LABEL: Record<AdLevel, string> = {
  beginner: 'Początkujący',
  intermediate: 'Średniozaawansowani',
  advanced: 'Zaawansowani',
};

/** The small tag drawn on every ad, so paid content is never mistaken for the app's own. */
export const AD_BADGES = ['Reklama', 'Sponsorowane', 'Polecamy', 'Partner'] as const;
export type AdBadge = (typeof AD_BADGES)[number];

export const AD_TONES = ['neutral', 'lime', 'ember'] as const;
export type AdTone = (typeof AD_TONES)[number];
export const AD_TONE_LABEL: Record<AdTone, string> = {
  neutral: 'Neutralny',
  lime: 'Limonkowy',
  ember: 'Pomarańczowy',
};

export const AD_LIMITS = { name: 80, advertiser: 80, title: 70, text: 180, ctaLabel: 24, link: 500 } as const;

/** An ad as the admin panel reads and writes it. */
export interface AdData {
  id: string;
  /** Internal name, never shown to athletes. */
  name: string;
  advertiser?: string;
  format: AdFormat;
  title?: string;
  text?: string;
  imageUrl?: string;
  ctaLabel?: string;
  /** In-app path (`/athlete/...`) or an external `https://` address. */
  link?: string;
  badge: AdBadge;
  tone: AdTone;
  placements: AdPlacement[];
  audience: AdAudience;
  /** Empty = every gender. */
  genders: AdGender[];
  /** Empty = every level. */
  trainingLevels: AdLevel[];
  dismissible: boolean;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  /** Relative share of views among ads competing for one slot. */
  weight: number;
  /** How many times a day one person may see it (0 = no limit). */
  dailyCapPerUser: number;
  /** Stop serving after this many views / clicks in total (0 = no limit). */
  maxImpressions: number;
  maxClicks: number;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

/** An ad as the athlete app receives it: only live ones matching the caller. */
export interface LiveAd {
  id: string;
  format: AdFormat;
  title?: string;
  text?: string;
  imageUrl?: string;
  ctaLabel?: string;
  link?: string;
  badge: AdBadge;
  tone: AdTone;
  placements: AdPlacement[];
  dismissible: boolean;
  weight: number;
  dailyCapPerUser: number;
  /** Lets the app drop an ad that ended while its copy of the list was cached. */
  endsAt: string | null;
}

export type AdStatus = 'live' | 'scheduled' | 'ended' | 'off' | 'exhausted';

export const AD_STATUS_LABEL: Record<AdStatus, string> = {
  live: 'Wyświetlana',
  scheduled: 'Zaplanowana',
  ended: 'Zakończona',
  off: 'Wyłączona',
  exhausted: 'Limit wyczerpany',
};

interface AdStatusInput {
  active: boolean;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  maxImpressions?: number;
  maxClicks?: number;
  impressions?: number;
  clicks?: number;
}

export function adStatus(ad: AdStatusInput, now: Date = new Date()): AdStatus {
  if (!ad.active) return 'off';
  if (ad.endsAt && new Date(ad.endsAt) <= now) return 'ended';
  if (ad.maxImpressions && (ad.impressions ?? 0) >= ad.maxImpressions) return 'exhausted';
  if (ad.maxClicks && (ad.clicks ?? 0) >= ad.maxClicks) return 'exhausted';
  if (ad.startsAt && new Date(ad.startsAt) > now) return 'scheduled';
  return 'live';
}

/** Click-through rate as a percentage with one decimal, or `null` without views. */
export function adCtr(impressions: number, clicks: number): number | null {
  if (!impressions) return null;
  return Math.round((clicks / impressions) * 1000) / 10;
}

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}: maksymalnie ${max} znaków.`)
    .nullish()
    .transform((value) => value || undefined);

const optionalDate = (label: string) =>
  z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((value, ctx) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({ code: 'custom', message: `${label}: nieprawidłowa data.` });
        return z.NEVER;
      }
      return date;
    });

const count = (label: string, max: number) =>
  z.coerce.number().int(`${label}: podaj liczbę całkowitą.`).min(0, `${label}: nie może być ujemne.`).max(max).default(0);

/** Validates a complete ad as sent by the admin form. */
export const adInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Nazwa wewnętrzna jest wymagana.').max(AD_LIMITS.name),
    advertiser: optionalText(AD_LIMITS.advertiser, 'Reklamodawca'),
    format: z.enum(AD_FORMATS, { message: 'Wybierz format reklamy.' }),
    title: optionalText(AD_LIMITS.title, 'Tytuł'),
    text: optionalText(AD_LIMITS.text, 'Opis'),
    imageUrl: optionalText(AD_LIMITS.link, 'Obraz'),
    ctaLabel: optionalText(AD_LIMITS.ctaLabel, 'Tekst przycisku'),
    link: optionalText(AD_LIMITS.link, 'Link'),
    badge: z.enum(AD_BADGES).default('Reklama'),
    tone: z.enum(AD_TONES).default('neutral'),
    placements: z.array(z.enum(AD_PLACEMENTS)).min(1, 'Wybierz przynajmniej jedno miejsce wyświetlania.'),
    audience: z.enum(AD_AUDIENCES).default('all'),
    genders: z.array(z.enum(AD_GENDERS)).default([]),
    trainingLevels: z.array(z.enum(AD_LEVELS)).default([]),
    dismissible: z.boolean().default(true),
    active: z.boolean().default(true),
    startsAt: optionalDate('Początek'),
    endsAt: optionalDate('Koniec'),
    weight: z.coerce.number().int().min(1, 'Waga: minimum 1.').max(100, 'Waga: maksimum 100.').default(1),
    dailyCapPerUser: count('Limit dzienny', 1000),
    maxImpressions: count('Limit wyświetleń', 1_000_000_000),
    maxClicks: count('Limit kliknięć', 1_000_000_000),
  })
  .superRefine((ad, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });

    if (ad.format === 'banner' && !ad.imageUrl) fail('imageUrl', 'Baner wymaga obrazu.');
    if (ad.format !== 'banner' && !ad.title) fail('title', 'Tytuł jest wymagany.');
    if (ad.link && !/^(\/athlete\/|https:\/\/)/.test(ad.link)) {
      fail('link', 'Link musi zaczynać się od /athlete/ albo https://.');
    }
    if (ad.imageUrl && !/^(\/upload-data\/|\/api\/images\/|https:\/\/)/.test(ad.imageUrl)) {
      fail('imageUrl', 'Obraz musi być przesłanym plikiem albo adresem https://.');
    }
    if (ad.startsAt && ad.endsAt && ad.endsAt <= ad.startsAt) {
      fail('endsAt', 'Koniec musi być późniejszy niż początek.');
    }
  });

export type AdInput = z.infer<typeof adInputSchema>;

/** Screens of the athlete app an ad can open (same list the home-screen content uses). */
export const AD_LINK_PRESETS = [
  { href: '/athlete/shop', label: 'Sklep' },
  { href: '/athlete/knowledge-zone', label: 'Baza wiedzy' },
  { href: '/athlete/log', label: 'Nowy trening' },
  { href: '/athlete/calendar', label: 'Kalendarz' },
  { href: '/athlete/running', label: 'Bieganie' },
  { href: '/athlete/nutrition', label: 'Jedzenie' },
  { href: '/athlete/habits', label: 'Nawyki' },
  { href: '/athlete/goals', label: 'Cele' },
  { href: '/athlete/trainers', label: 'Trenerzy' },
  { href: '/athlete/social', label: 'Ekipa' },
] as const;

/** `YYYY-MM-DD` in UTC — the bucket key of the daily ad statistics. */
export function adDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
