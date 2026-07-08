export interface AIFoodResult {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    unit: string;
}

/**
 * Searches for food nutrition data using OpenRouter (google/gemini-2.5-flash-lite)
 * with the Web Search plugin (engine: auto, context size: medium).
 * Returns nutrition values per 100g.
 */
export async function searchFoodWithAI(query: string): Promise<AIFoodResult[]> {
    const apiKey = process.env.OPEN_ROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('Missing OPEN_ROUTER_API_KEY in environment variables.');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            plugins: [{ id: 'web' }],
            web_search_options: { search_context_size: 'medium' },
            messages: [
                {
                    role: 'system',
                    content: `Jesteś asystentem dietetycznym. Użytkownik poda nazwę produktu spożywczego. Wyszukaj w internecie aktualne wartości odżywcze tego produktu (na 100 g).
Zwróć WYŁĄCZNIE poprawny JSON (bez markdown, bez komentarzy) w formacie:
{"products":[{"name":"nazwa po polsku","calories":liczba,"protein":liczba,"carbs":liczba,"fat":liczba,"unit":"g"}]}
Zasady:
- wartości odżywcze ZAWSZE w przeliczeniu na 100 g produktu (kalorie w kcal, makroskładniki w gramach)
- przykład: twaróg półtłusty o wartości 120 kcal, 17 g białka, 4 g węglowodanów, 4 g tłuszczu na 100 g to {"name":"Twaróg półtłusty","calories":120,"protein":17,"carbs":4,"fat":4,"unit":"g"}
- kalorie na 100 g mieszczą się w zakresie 0-900, makroskładniki w zakresie 0-100
- maksymalnie 5 najbardziej trafnych produktów/wariantów
- liczby jako number, nie string; kropka jako separator dziesiętny; bez wartości null
- pomiń produkty, dla których nie znalazłeś wiarygodnych danych; jeśli brak jakichkolwiek, zwróć {"products":[]}`,
                },
                {
                    role: 'user',
                    content: query,
                },
            ],
        }),
        cache: 'no-store',
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`[OpenRouter] Food search error: ${response.status} - ${text}`);
        throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || '';

    // The model may wrap JSON in a markdown code block despite instructions
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error('[OpenRouter] No JSON found in response:', content);
        return [];
    }

    try {
        const parsed = JSON.parse(jsonMatch[0]);
        const products = Array.isArray(parsed.products) ? parsed.products : [];

        return products
            .filter((p: any) => p && typeof p.name === 'string')
            .map((p: any) => ({
                name: p.name,
                calories: Number(p.calories) || 0,
                protein: Number(p.protein) || 0,
                carbs: Number(p.carbs) || 0,
                fat: Number(p.fat) || 0,
                unit: typeof p.unit === 'string' ? p.unit : 'g',
            }))
            // Sanity check: plausible values per 100g only, so bad AI data never lands in the DB
            .filter((p: AIFoodResult) =>
                p.calories > 0 && p.calories <= 900 &&
                p.protein >= 0 && p.protein <= 100 &&
                p.carbs >= 0 && p.carbs <= 100 &&
                p.fat >= 0 && p.fat <= 100
            );
    } catch (error) {
        console.error('[OpenRouter] Failed to parse food JSON:', error, content);
        return [];
    }
}
