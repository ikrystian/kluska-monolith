const RUN_SUMMARY_MODEL = 'google/gemini-3.5-flash-lite';

export interface RunSummarySplit {
    km: number;
    distanceM: number;
    elapsedS: number;
    avgPaceMinPerKm: number;
    elevationGainM: number;
}

export interface RunSummaryData {
    date: string;
    programName?: string;
    notes?: string;
    distanceKm: number;
    durationMin: number;
    avgPaceMinPerKm: number;
    elevationGainM: number;
    splits: RunSummarySplit[];
}

const SYSTEM_PROMPT = `Jesteś wirtualnym trenerem biegowym. Dostajesz dane z jednego biegu zawodnika i piszesz o nim krótkie podsumowanie.
Zasady:
- dokładnie 3 zdania, po polsku
- ton bardzo żartobliwy, ale motywujący
- odnieś się do konkretnych liczb z danych (dystans, tempo, przewyższenia, podziały na kilometry)
- zwykły tekst: bez markdown, bez list, bez nagłówków`;

/**
 * Asks OpenRouter (google/gemini-3.5-flash-lite) for a short, playful and
 * motivating summary of a single run. Returns the plain text reply.
 */
export async function generateRunSummary(run: RunSummaryData): Promise<string> {
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
            model: RUN_SUMMARY_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `Dane biegu (JSON):\n${JSON.stringify(run, null, 2)}` },
            ],
        }),
        cache: 'no-store',
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`[OpenRouter] Run summary error: ${response.status} - ${text}`);
        throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content?.trim() || '';
    if (!content) {
        throw new Error('OpenRouter returned an empty run summary.');
    }

    return content;
}
