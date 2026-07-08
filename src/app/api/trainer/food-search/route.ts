import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import CustomProduct from '@/models/CustomProduct';
import { searchFoodWithAI } from '@/lib/openrouter-food';

/**
 * GET /api/trainer/food-search?query=...
 * Searches the local product database first (trainer's own products + AI-sourced global ones).
 * If nothing is found, falls back to OpenRouter web search and persists the results,
 * so future queries are served from the local database.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const query = req.nextUrl.searchParams.get('query')?.trim();
        if (!query) {
            return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
        }

        await dbConnect();

        const localProducts = await CustomProduct.find({
            name: { $regex: query, $options: 'i' },
            $or: [{ trainerId: session.user.id }, { source: 'ai' }],
        })
            .sort({ createdAt: -1 })
            .limit(20);

        if (localProducts.length > 0) {
            return NextResponse.json({ products: localProducts, origin: 'local' });
        }

        // Nothing locally — ask AI with web search, then persist for future lookups
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
