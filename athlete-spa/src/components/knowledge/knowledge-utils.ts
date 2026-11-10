import { useCallback, useEffect, useState } from 'react';
import { resolveMediaUrl } from '@/lib/api-client';
import { resolveStoredImageUrl } from '@/lib/upload';
import type { Article } from '@/lib/types';

const WORDS_PER_MINUTE = 200;
const READ_STORAGE_KEY = 'athlete-spa:knowledge-read';
const CATEGORY_COLORS = ['--chart-1', '--chart-2', '--chart-4', '--chart-5', '--chart-3'];

export const UNCATEGORIZED = 'Bez kategorii';

/** Knowledge-zone categories the diet screen pulls from. */
export const RECIPE_CATEGORY = 'Przepisy';
export const DIET_CATEGORY = 'Dieta i Suplementacja';

/** Has per-serving macros, so the dish can be logged to the food diary in one tap. */
export function hasRecipeNutrition(article: Pick<Article, 'recipe'>): boolean {
  return Boolean(article.recipe && article.recipe.calories > 0);
}

export function isRecipeArticle(article: Pick<Article, 'category' | 'recipe'>): boolean {
  return hasRecipeNutrition(article) || /przepis/i.test(article.category ?? '');
}

/** Diet and supplementation reading (recipes excluded — they get their own shelf). */
export function isDietArticle(article: Pick<Article, 'category' | 'recipe'>): boolean {
  return !isRecipeArticle(article) && /diet|suplement|odżyw|żywien/i.test(article.category ?? '');
}

/** Plain text of the article's HTML body, whitespace collapsed. */
export function stripHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function readingMinutes(html: string): number {
  const words = stripHtml(html).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function excerpt(html: string, maxLength = 140): string {
  const text = stripHtml(html);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).replace(/\s+\S*$/, '')}…`;
}

export function articleCoverUrl(article: Pick<Article, 'id' | 'coverImageUrl'>, size = '800/600'): string {
  return article.coverImageUrl
    ? resolveMediaUrl(resolveStoredImageUrl(article.coverImageUrl))
    : `https://picsum.photos/seed/${article.id}/${size}`;
}

/** Stable accent per category, following the order categories are defined in. */
export function categoryColor(category: string, orderedCategories: string[]): string {
  const index = orderedCategories.indexOf(category);
  if (index < 0) return 'hsl(var(--muted-foreground))';
  return `hsl(var(${CATEGORY_COLORS[index % CATEGORY_COLORS.length]}))`;
}

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Which articles this device has opened — a per-viewer convenience, so browser storage is enough. */
export function useReadArticles() {
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === READ_STORAGE_KEY) setReadIds(loadReadIds());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const markRead = useCallback((id: string) => {
    setReadIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Storage unavailable (private mode) — read state just won't persist.
      }
      return next;
    });
  }, []);

  return { readIds, markRead };
}
