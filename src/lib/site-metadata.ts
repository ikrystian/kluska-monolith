import type { Metadata } from 'next';

export const SITE_NAME = 'Leniwa Kluska';
export const SITE_URL = (process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3001').replace(/\/$/, '');

export const DEFAULT_OG_IMAGE = {
  url: '/og-image.jpg',
  width: 1200,
  height: 630,
  type: 'image/jpeg',
  alt: 'Leniwa Kluska — aplikacja do śledzenia treningów, biegania i diety',
};

/** Next.js replaces (not merges) a parent's openGraph, so pages build on this. */
export const BASE_OPEN_GRAPH = {
  type: 'website',
  siteName: SITE_NAME,
  locale: 'pl_PL',
  images: [DEFAULT_OG_IMAGE],
} satisfies Metadata['openGraph'];
