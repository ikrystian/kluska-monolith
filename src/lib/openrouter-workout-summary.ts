const WORKOUT_SUMMARY_MODEL = 'deepseek/deepseek-v4.1-flash';

export interface WorkoutSummarySet {
    number: number;
    type: string;
    reps: number;
    weightKg: number;
    durationS?: number;
    rpe?: number;
    completed: boolean;
}

export interface WorkoutSummaryExercise {
    name: string;
    type: string;
    muscleGroups: string[];
    sets: WorkoutSummarySet[];
}

export interface WorkoutSummaryData {
    workoutName: string;
    date: string;
    durationMin?: number;
    gymName?: string;
    totalVolumeKg: number;
    completedSets: number;
    exercises: WorkoutSummaryExercise[];
}

const SYSTEM_PROMPT = `Jesteś wirtualnym trenerem personalnym. Dostajesz dane z jednego treningu siłowego zawodnika (JSON) i piszesz mu jego podsumowanie, zwracając się do niego bezpośrednio.
Zasady:
- 4–6 zdań, po polsku
- ton ciepły, rzeczowy i motywujący, z lekkim humorem
- odnieś się do konkretnych liczb z danych (tonaż, ciężary, powtórzenia, czas, liczba serii)
- wskaż jedną mocną stronę treningu i daj jedną konkretną wskazówkę na następny raz
- serie z "completed": false nie zostały wykonane — nie chwal ich
- zwykły tekst: bez markdown, bez list, bez nagłówków`;

/**
 * Asks OpenRouter (DeepSeek Flash) to analyse a finished strength workout
 * and returns a short coach-style summary as plain text.
 */
export async function generateWorkoutSummary(workout: WorkoutSummaryData): Promise<string> {
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
            model: WORKOUT_SUMMARY_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `Dane treningu (JSON):\n${JSON.stringify(workout, null, 2)}` },
            ],
        }),
        cache: 'no-store',
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`[OpenRouter] Workout summary error: ${response.status} - ${text}`);
        throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content?.trim() || '';
    if (!content) {
        throw new Error('OpenRouter returned an empty workout summary.');
    }

    return content;
}
