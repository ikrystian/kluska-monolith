import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { findCachedProducts } from '@/lib/food-products';

// GET /api/athlete/nutrition/search/local?query=...
// Products from the local cache only — never calls the web search, so the
// diary can show matches while the athlete is still typing.
export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const query = request.nextUrl.searchParams.get('query')?.trim().slice(0, 120) ?? '';
        if (query.length < 2) {
            return NextResponse.json({ products: [] });
        }

        await connectToDatabase();
        return NextResponse.json({ products: await findCachedProducts(query, 12) });
    } catch (error) {
        console.error('Error searching cached foods:', error);
        return NextResponse.json({ error: 'Failed to search foods' }, { status: 500 });
    }
}
