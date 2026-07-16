import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import CustomProduct from '@/models/CustomProduct';
import { searchFoodWithAI } from '@/lib/openrouter-food';

/**
 * GET /api/athlete/nutrition/search?query=...
 * Product search for the calorie diary: local AI-sourced product cache first,
 * then OpenRouter web search as fallback (results are persisted so future
 * queries — from athletes and trainers alike — hit the local database).
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const query = request.nextUrl.searchParams.get('query')?.trim();
        if (!query) {
            return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
        }

        await connectToDatabase();

        // Athletes only see the global AI-sourced cache, not trainers' private products
        const localProducts = await CustomProduct.find({
            name: { $regex: query, $options: 'i' },
            source: 'ai',
        })
            .sort({ createdAt: -1 })
            .limit(20);

        if (localProducts.length > 0) {
            return NextResponse.json({ products: localProducts, origin: 'local' });
        }

        const aiResults = await searchFoodWithAI(query);

        if (aiResults.length === 0) {
            return NextResponse.json({ products: [], origin: 'ai' });
        }

        const savedProducts = await Promise.all(
            aiResults.map(async (result) => {
                // Avoid duplicating a product that already exists under the same name
                const existing = await CustomProduct.findOne({
                    name: { $regex: `^${result.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
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
