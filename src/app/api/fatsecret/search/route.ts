import { NextRequest, NextResponse } from 'next/server';
import { searchFatSecretFood, getFatSecretFoodDetails } from '@/lib/fatsecret';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Assuming authOptions is exported from here, need to verify

export async function GET(req: NextRequest) {
    // TODO: Add authentication check if needed, though search might be public for authenticated users
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('query');
    const foodId = searchParams.get('foodId');

    if (foodId) {
        try {
            const details = await getFatSecretFoodDetails(foodId);
            return NextResponse.json({ servings: details });
        } catch (error) {
            console.error('Error fetching food details:', error);
            return NextResponse.json({ error: 'Failed to fetch food details' }, { status: 500 });
        }
    }

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    try {
        console.log(`[API] Searching for: ${query}`);
        const foods = await searchFatSecretFood(query);
        console.log(`[API] Found ${foods.length} items`);
        return NextResponse.json({ foods });
    } catch (error) {
        console.error('Error searching foods:', error);
        return NextResponse.json({ error: 'Failed to search foods' }, { status: 500 });
    }
}
