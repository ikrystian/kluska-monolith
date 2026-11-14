import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import CustomProduct from '@/models/CustomProduct';
import { searchFoodWithAI } from '@/lib/openrouter-food';
import { escapeRegex } from '@/lib/food-diary';
import { findCachedProducts } from '@/lib/food-products';

/**
 * GET /api/athlete/nutrition/search?query=...[&mode=web]
 * Product search for the calorie diary: local AI-sourced product cache first,
 * then OpenRouter web search as fallback (results are persisted so future
 * queries — from athletes and trainers alike — hit the local database).
 *
 * `mode=web` always asks the web search, for when the cache has matches but
 * not the product the athlete wants. The cache alone is served by
 * ./local/route.ts, which is cheap enough to call on every keystroke.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const query = request.nextUrl.searchParams.get('query')?.trim().slice(0, 120);
        if (!query) {
            return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
        }
        const mode = request.nextUrl.searchParams.get('mode');

        await connectToDatabase();

        if (mode !== 'web') {
            const localProducts = await findCachedProducts(query);
            if (localProducts.length > 0) {
                return NextResponse.json({ products: localProducts, origin: 'local' });
            }
        }

        const aiResults = await searchFoodWithAI(query);

        if (aiResults.length === 0) {
            return NextResponse.json({ products: [], origin: 'ai' });
        }

        const savedProducts = await Promise.all(
            aiResults.map(async (result) => {
                // Avoid duplicating a product that already exists under the same name
                const existing = await CustomProduct.findOne({
                    name: { $regex: `^${escapeRegex(result.name)}$`, $options: 'i' },
                    source: 'ai',
                });
                if (existing) return existing;

                return CustomProduct.create({ ...result, source: 'ai' });
            })
        );

        return NextResponse.json({ products: savedProducts, origin: 'ai' });
    } catch (error) {
        console.error('Error searching foods:', error);
        return NextResponse.json({ error: 'Failed to search foods' }, { status: 500 });
    }
}
