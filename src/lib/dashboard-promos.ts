import { z } from 'zod';

/**
 * Admin-defined content shown at the top of the athlete's home screen, above
 * the week strip: a banner, a recommended shop product, a recommended article
 * or a short announcement.
 *
 * This file is safe to import from client components (no database access).
 */

export const PROMO_TYPES = ['banner', 'product', 'article', 'announcement'] as const;
export type PromoType = (typeof PROMO_TYPES)[number];

export const PROMO_TONES = ['lime', 'ember', 'neutral'] as const;
export type PromoTone = (typeof PROMO_TONES)[number];

export const PROMO_AUDIENCES = ['all', 'accounts', 'guests'] as const;
export type PromoAudience = (typeof PROMO_AUDIENCES)[number];

export const PROMO_TYPE_LABEL: Record<PromoType, string> = {
  banner: 'Baner',
  product: 'Produkt ze sklepu',
  article: 'Artykuł',
  announcement: 'Ogłoszenie',
};

export const PROMO_TONE_LABEL: Record<PromoTone, string> = {
  lime: 'Limonkowy',
  ember: 'Pomarańczowy',
  neutral: 'Neutralny',
};

export const PROMO_AUDIENCE_LABEL: Record<PromoAudience, string> = {
  all: 'Wszyscy',
  accounts: 'Tylko zarejestrowani',
  guests: 'Tylko goście',
};

/**
 * Products that can be recommended. Mirrors the ids of the catalogue in
 * `athlete-spa/src/lib/shop.ts` — the app draws the card from its own
 * catalogue and silently skips an id it does not know.
 */
export const SHOP_PRODUCT_OPTIONS = [
  { id: 'hoodie-men', name: 'Bluza #leniwakluska męska' },
  { id: 'hoodie-women', name: 'Bluza #leniwakluska damska' },
  { id: 'tee-men', name: 'Koszulka #leniwakluska męska' },
  { id: 'tank-women', name: 'Top #leniwakluska damski' },
] as const;

/** Screens of the athlete app a banner can open. */
export const PROMO_LINK_PRESETS = [
  { href: '/athlete/shop', label: 'Sklep' },
  { href: '/athlete/knowledge-zone', label: 'Baza wiedzy' },
  { href: '/athlete/log', label: 'Nowy trening' },
  { href: '/athlete/calendar', label: 'Kalendarz' },
  { href: '/athlete/running', label: 'Bieganie' },
  { href: '/athlete/nutrition', label: 'Jedzenie' },
  { href: '/athlete/habits', label: 'Nawyki' },
  { href: '/athlete/goals', label: 'Cele' },
  { href: '/athlete/progress', label: 'Postępy' },
  { href: '/athlete/social', label: 'Ekipa' },
  { href: '/athlete/profile', label: 'Profil' },
] as const;

export const PROMO_LIMITS = { title: 60, text: 160, ctaLabel: 24, link: 500 } as const;

/** A promo as the admin panel reads and writes it. */
export interface DashboardPromoData {
  id: string;
  type: PromoType;
  title: string;
  text?: string;
  imageUrl?: string;
  ctaLabel?: string;
  /** In-app path (`/athlete/...`) or an external `https://` address. */
  link?: string;
  productId?: string;
  articleId?: string;
  tone: PromoTone;
  audience: PromoAudience;
  dismissible: boolean;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  /** Lower shows first. */
  order: number;
  createdAt: string;
  updatedAt: string;
}

/** A promo as the athlete app receives it: only live ones, article already resolved. */
export interface LiveDashboardPromo {
  id: string;
  type: PromoType;
  title: string;
  text?: string;
  imageUrl?: string;
  ctaLabel?: string;
  link?: string;
  productId?: string;
  article?: { id: string; title: string; category?: string; coverImageUrl?: string };
  tone: PromoTone;
  dismissible: boolean;
  /** Lets the app drop a promo that ended while its copy of the list was cached. */
  endsAt: string | null;
}

export type PromoStatus = 'live' | 'scheduled' | 'ended' | 'off';

export function promoStatus(
  promo: { active: boolean; startsAt?: string | Date | null; endsAt?: string | Date | null },
  now: Date = new Date()
): PromoStatus {
  if (!promo.active) return 'off';
  if (promo.endsAt && new Date(promo.endsAt) <= now) return 'ended';
  if (promo.startsAt && new Date(promo.startsAt) > now) return 'scheduled';
  return 'live';
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
    .union([z.string(), z.null()])
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

/** Validates a complete promo as sent by the admin form. */
export const promoInputSchema = z
  .object({
    type: z.enum(PROMO_TYPES, { message: 'Wybierz rodzaj treści.' }),
    title: z
      .string()
      .trim()
      .max(PROMO_LIMITS.title, `Tytuł: maksymalnie ${PROMO_LIMITS.title} znaków.`)
      .nullish()
      .transform((value) => value ?? ''),
    text: optionalText(PROMO_LIMITS.text, 'Opis'),
    imageUrl: optionalText(PROMO_LIMITS.link, 'Obraz'),
    ctaLabel: optionalText(PROMO_LIMITS.ctaLabel, 'Tekst przycisku'),
    link: optionalText(PROMO_LIMITS.link, 'Link'),
    productId: optionalText(80, 'Produkt'),
    articleId: optionalText(80, 'Artykuł'),
    tone: z.enum(PROMO_TONES).default('neutral'),
    audience: z.enum(PROMO_AUDIENCES).default('all'),
    dismissible: z.boolean().default(true),
    active: z.boolean().default(true),
    startsAt: optionalDate('Początek'),
    endsAt: optionalDate('Koniec'),
    order: z.coerce.number().int('Kolejność musi być liczbą całkowitą.').min(0).max(9999).default(0),
  })
  .superRefine((promo, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });

    if ((promo.type === 'banner' || promo.type === 'announcement') && !promo.title) {
      fail('title', 'Tytuł jest wymagany.');
    }
    if (promo.type === 'product' && !SHOP_PRODUCT_OPTIONS.some((product) => product.id === promo.productId)) {
      fail('productId', 'Wybierz produkt ze sklepu.');
    }
    if (promo.type === 'article' && !promo.articleId) {
      fail('articleId', 'Wybierz artykuł.');
    }
    if (promo.link && !/^(\/athlete\/|https:\/\/)/.test(promo.link)) {
      fail('link', 'Link musi zaczynać się od /athlete/ albo https://.');
    }
    if (promo.imageUrl && !/^(\/upload-data\/|\/api\/images\/|https:\/\/)/.test(promo.imageUrl)) {
      fail('imageUrl', 'Obraz musi być przesłanym plikiem albo adresem https://.');
    }
    if (promo.startsAt && promo.endsAt && promo.endsAt <= promo.startsAt) {
      fail('endsAt', 'Koniec musi być późniejszy niż początek.');
    }
  });

export type PromoInput = z.infer<typeof promoInputSchema>;
