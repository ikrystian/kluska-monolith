import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { cached, cacheKeys } from '@/lib/server-cache';
import { Article } from '@/models/Article';
import { DashboardPromo } from '@/models/DashboardPromo';
import type { LiveDashboardPromo, PromoAudience } from '@/lib/dashboard-promos';

/** Short, so a newly published article or a promo edited on another instance shows up soon. */
const PROMOS_TTL_MS = 60_000;

interface SwitchedOnPromo extends LiveDashboardPromo {
  audience: PromoAudience;
  startsAt: string | null;
}

/** Every switched-on promo with its article resolved; the date window is applied per request. */
async function loadSwitchedOnPromos(): Promise<SwitchedOnPromo[]> {
  await connectToDatabase();
  const docs = await DashboardPromo.find({ active: true }).sort({ order: 1, createdAt: -1 }).lean();

  const articleIds = docs
    .filter((doc) => doc.type === 'article' && doc.articleId && mongoose.isValidObjectId(doc.articleId))
    .map((doc) => doc.articleId!);
  const articles = articleIds.length
    ? await Article.find({ _id: { $in: articleIds }, status: 'published' })
        .select('title category coverImageUrl')
        .lean()
    : [];
  const articleById = new Map(articles.map((article) => [String(article._id), article]));

  const promos: SwitchedOnPromo[] = [];
  for (const doc of docs) {
    const article = doc.type === 'article' ? articleById.get(doc.articleId ?? '') : undefined;
    // The recommended article was deleted or unpublished: nothing to show.
    if (doc.type === 'article' && !article) continue;

    promos.push({
      id: String(doc._id),
      type: doc.type,
      title: doc.title ?? '',
      text: doc.text || undefined,
      imageUrl: doc.imageUrl || undefined,
      ctaLabel: doc.ctaLabel || undefined,
      link: doc.link || undefined,
      productId: doc.productId || undefined,
      article: article
        ? {
            id: String(article._id),
            title: article.title,
            category: article.category || undefined,
            coverImageUrl: article.coverImageUrl || undefined,
          }
        : undefined,
      tone: doc.tone ?? 'neutral',
      dismissible: doc.dismissible ?? true,
      audience: doc.audience ?? 'all',
      startsAt: doc.startsAt ? new Date(doc.startsAt).toISOString() : null,
      endsAt: doc.endsAt ? new Date(doc.endsAt).toISOString() : null,
    });
  }
  return promos;
}

/** Promos this user should see right now, in display order. */
export async function getLivePromos(user: { isGuest?: boolean }): Promise<LiveDashboardPromo[]> {
  const promos = await cached(cacheKeys.dashboardPromos, { ttlMs: PROMOS_TTL_MS }, loadSwitchedOnPromos);
  const now = Date.now();

  return promos
    .filter((promo) => {
      if (promo.startsAt && new Date(promo.startsAt).getTime() > now) return false;
      if (promo.endsAt && new Date(promo.endsAt).getTime() <= now) return false;
      if (promo.audience === 'guests') return Boolean(user.isGuest);
      if (promo.audience === 'accounts') return !user.isGuest;
      return true;
    })
    .map(({ audience: _audience, startsAt: _startsAt, ...promo }) => promo);
}

/** Returns an error response unless the request comes from an admin. */
export async function denyUnlessAdmin(request: Request): Promise<NextResponse | null> {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}
