'use server';

interface FatSecretFood {
    food_id: string;
    food_name: string;
    food_type: 'Generic' | 'Brand';
    food_url: string;
    servings: {
        serving: Serving | Serving[];
    }
}

interface Serving {
    food_name: string; 
    serving_id: string;
    serving_description: string;
    serving_url: string;
    metric_serving_amount: string;
    metric_serving_unit: string;
    number_of_units: string;
    measurement_description: string;
    calories: string;
    carbohydrate: string;
    protein: string;
    fat: string;
    saturated_fat?: string;
    polyunsaturated_fat?: string;
    monounsaturated_fat?: string;
    trans_fat?: string;
    cholesterol?: string;
    sodium?: string;
    potassium?: string;
    fiber?: string;
    sugar?: string;
    vitamin_a?: string;
    vitamin_c?: string;
    calcium?: string;
    iron?: string;
}

interface SearchResponse {
    foods?: {
        food: FatSecretFood[];
        max_results: string;
        page_number: string;
        total_results: string;
    },
    error?: {
        code: number;
        message: string;
    }
}

let accessToken: { token: string, expires_at: number } | null = null;

async function getAccessToken(): Promise<string> {
    const clientId = process.env.FATSECRET_CLIENT_ID;
    const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('FatSecret API credentials are not configured in .env file.');
    }
    
    if (accessToken && accessToken.expires_at > Date.now()) {
        return accessToken.token;
    }
    
    const tokenUrl = 'https://oauth.fatsecret.com/connect/token';

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'grant_type': 'client_credentials',
            'scope': 'basic',
            'client_id': clientId,
            'client_secret': clientSecret,
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FatSecret Token API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    accessToken = {
        token: data.access_token,
        expires_at: Date.now() + (data.expires_in * 1000)
    };
    
    return accessToken!.token;
}

export async function searchFood(query: string): Promise<Serving[]> {
    const apiUrl = 'https://platform.fatsecret.com/rest/foods.search.v2';

    try {
        const token = await getAccessToken();

        const params = new URLSearchParams({
            search_expression: query,
            format: 'json',
            page_number: '0',
            max_results: '20'
        });

        const response = await fetch(`${apiUrl}?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`FatSecret API Error: ${response.status} ${errorText}`);
        }

        const data: SearchResponse = await response.json();
        
        if (data.error) {
            throw new Error(`FatSecret API Error: ${data.error.message}`);
        }

        if (!data.foods || !data.foods.food) {
            return [];
        }

        const foods = data.foods.food;

        // The servings can be a single object or an array. We normalize it.
        return foods.flatMap(food => {
             if (!food.servings?.serving) return [];
             const servings = Array.isArray(food.servings.serving) ? food.servings.serving : [food.servings.serving];
             return servings.map(serving => ({ ...serving, food_name: food.food_name }));
        });

    } catch (error) {
        console.error("An error occurred in searchFood:", error);
        // Invalidate token on error in case it's an auth issue
        if (error instanceof Error && error.message.includes('auth')) {
            accessToken = null;
        }
        throw error;
    }
}
