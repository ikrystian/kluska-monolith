import type { AIFoodResult } from '@/lib/openrouter-food';

/**
 * Looks up a product by EAN/UPC barcode in the Open Food Facts database.
 * Free, no API key. Returns nutrition per 100 g or null when the product
 * is unknown or has no usable nutriment data (caller then falls back to AI).
 */
export async function lookupBarcodeInOpenFoodFacts(barcode: string): Promise<AIFoodResult | null> {
    try {
        const response = await fetch(
            `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_pl,brands,nutriments,image_front_url,image_url`,
            {
                headers: { 'User-Agent': 'LeniwaKluska/1.0 (kontakt: krystian@bpcoders.pl)' },
                cache: 'no-store',
            }
        );

        if (!response.ok) return null;

        const data = await response.json();
        if (data.status !== 1 || !data.product) return null;

        const product = data.product;
        const nutriments = product.nutriments ?? {};

        const calories = Number(nutriments['energy-kcal_100g']);
        if (!Number.isFinite(calories) || calories <= 0 || calories > 900) return null;

        const name: string = product.product_name_pl || product.product_name || '';
        if (!name) return null;

        const clamp = (value: unknown) => {
            const n = Number(value);
            return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0;
        };

        const imageUrl: string | undefined =
            (typeof product.image_front_url === 'string' && product.image_front_url) ||
            (typeof product.image_url === 'string' && product.image_url) ||
            undefined;

        return {
            name,
            imageUrl,
            brand: typeof product.brands === 'string' && product.brands.trim()
                ? product.brands.split(',')[0].trim()
                : undefined,
            calories: Math.round(calories),
            protein: clamp(nutriments['proteins_100g']),
            carbs: clamp(nutriments['carbohydrates_100g']),
            fat: clamp(nutriments['fat_100g']),
            unit: 'g',
        };
    } catch (error) {
        console.error('[OpenFoodFacts] Barcode lookup failed:', error);
        return null;
    }
}
