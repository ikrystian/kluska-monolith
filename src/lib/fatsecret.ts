'use server';

interface FatSecretToken {
    access_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
    const clientId = process.env.FATSECRET_CLIENT_ID;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('FatSecret credentials not found in environment variables.');
    }

    if (tokenCache && Date.now() < tokenCache.expiresAt) {
        return tokenCache.token;
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
        const response = await fetch('https://oauth.fatsecret.com/connect/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials&scope=premier',
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('FatSecret token error response:', errorBody);
            throw new Error(`Failed to get access token: ${response.statusText} - ${errorBody}`);
        }

        const data: FatSecretToken = await response.json();

        // Set expiration slightly before actual expiry to be safe (e.g., 60 seconds)
        tokenCache = {
            token: data.access_token,
            expiresAt: Date.now() + (data.expires_in * 1000) - 60000,
        };

        return data.access_token;
    } catch (error) {
        console.error('Error fetching FatSecret token:', error);
        throw error;
    }
}

export interface FatSecretFood {
    food_id: string;
    food_name: string;
    food_type: string;
    food_url: string;
    brand_name?: string;
    food_description: string;
    servings?: {
        serving: FatSecretServing[] | FatSecretServing;
    };
}

export interface FatSecretSearchResponse {
    foods_search: {
        max_results: string;
        total_results: string;
        page_number: string;
        results: {
            food: FatSecretFood[];
        };
    };
}

export interface FatSecretServing {
    serving_id: string;
    serving_description: string;
    serving_url: string;
    metric_serving_amount?: string;
    metric_serving_unit?: string;
    number_of_units: string;
    measurement_description: string;
    calories: string;
    carbohydrate: string;
    protein: string;
    fat: string;
}

export interface FatSecretFoodDetails {
    food: {
        food_id: string;
        food_name: string;
        servings: {
            serving: FatSecretServing[] | FatSecretServing;
        };
    };
}

export async function searchFatSecretFood(query: string): Promise<FatSecretFood[]> {
    // try { // Removed try-catch to allow error propagation
    const token = await getAccessToken();
    const params = new URLSearchParams({
        search_expression: query,
        format: 'json',
        max_results: '20',
    });

    const response = await fetch(`https://platform.fatsecret.com/rest/foods/search/v4?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        cache: 'no-store', // Disable caching
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`[Lib] FatSecret API Error: ${response.status} - ${text}`);
        throw new Error(`FatSecret API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Lib] Raw FatSecret Response:', JSON.stringify(data, null, 2));

    if (data.error) {
        throw new Error(`FatSecret API error: ${data.error.message}`);
    }

    const foods = data.foods_search?.results?.food || data.foods?.food || [];
    // Ensure it's always an array (API might return single object if only one result)
    return Array.isArray(foods) ? foods : [foods];
    // } catch (error) {
    //     console.error('Error searching FatSecret:', error);
    //     return [];
    // }
}

export async function getFatSecretFoodDetails(foodId: string): Promise<FatSecretServing[]> {
    try {
        const token = await getAccessToken();
        const params = new URLSearchParams({
            food_id: foodId,
            format: 'json',
        });

        const response = await fetch(`https://platform.fatsecret.com/rest/food/v4?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`FatSecret API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(`FatSecret API error: ${data.error.message}`);
        }

        const servings = data.food?.servings?.serving || [];
        return Array.isArray(servings) ? servings : [servings];

    } catch (error) {
        console.error('Error getting FatSecret food details:', error);
        return [];
    }
}
