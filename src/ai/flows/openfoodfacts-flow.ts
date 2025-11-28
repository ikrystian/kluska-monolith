'use server';

export interface OpenFoodFactsProduct {
    product_name: string;
    code: string;
    nutriments: {
        "energy-kcal_100g"?: number;
        proteins_100g?: number;
        carbohydrates_100g?: number;
        fat_100g?: number;
    };
    brands?: string;
}

export interface Serving {
    food_name: string;
    serving_id: string;
    serving_description: string;
    calories: string;
    protein: string;
    carbohydrate: string;
    fat: string;
}

interface SearchResponse {
    count: number;
    page: number;
    products: OpenFoodFactsProduct[];
}

export async function searchFood(query: string): Promise<Serving[]> {
    const apiUrl = 'https://world.openfoodfacts.org/cgi/search.pl';

    try {
        const params = new URLSearchParams({
            search_terms: query,
            search_simple: '1',
            action: 'process',
            json: '1',
            page_size: '20',
            fields: 'product_name,code,nutriments,brands'
        });

        const response = await fetch(`${apiUrl}?${params.toString()}`, {
            method: 'GET',
            headers: {
                'User-Agent': 'KluskaMonolith/1.0 (krystian@example.com)' // Good practice for OFF API
            }
        });

        if (!response.ok) {
            throw new Error(`Open Food Facts API Error: ${response.status}`);
        }

        const data: SearchResponse = await response.json();

        if (!data.products) {
            return [];
        }

        return data.products.map(product => {
            const name = product.brands
                ? `${product.product_name} (${product.brands})`
                : product.product_name || 'Unknown Product';

            return {
                food_name: name,
                serving_id: product.code,
                serving_description: '100g', // OFF standardizes on 100g
                calories: (product.nutriments["energy-kcal_100g"] || 0).toString(),
                protein: (product.nutriments.proteins_100g || 0).toString(),
                carbohydrate: (product.nutriments.carbohydrates_100g || 0).toString(),
                fat: (product.nutriments.fat_100g || 0).toString(),
            };
        });

    } catch (error) {
        console.error("An error occurred in searchFood (Open Food Facts):", error);
        throw error;
    }
}
