import { fallbackSpeech, type CoachMetrics, type CoachStatus } from '@/lib/run-coach-metrics';

const RUN_COACH_MODEL = 'openai/gpt-5.4-nano';
const REQUEST_TIMEOUT_MS = 15_000;

export interface CoachAdvice {
    status: CoachStatus;
    progressPercent: number;
    currentPaceSPerKm: number;
    avgPaceSPerKm: number;
    targetPaceSPerKm: number | null;
    nextKmTargetSplitS: number | null;
    requiredPaceSPerKm: number | null;
    projectedFinishS: number | null;
    projectedDistanceKm: number | null;
    deltaVsPlanS: number | null;
    goalCompleted: boolean;
    /** One concrete instruction for the next kilometre, shown on screen. */
    tip: string;
    /** What the voice says — Polish, numbers phrased for text-to-speech. */
    speech: string;
    /** False when the model failed and the plain fallback line was used. */
    fromModel: boolean;
}

const SYSTEM_PROMPT = `Jesteś głosowym trenerem biegowym, który mówi do biegacza przez słuchawki W TRAKCIE biegu, co każdy ukończony kilometr.
Styl: jak polski twórca internetowy Walaszek — mocno absurdalny humor, groteskowa powaga i dramatyczny patos, który nagle zderza się z czymś zupełnie przyziemnym (osiedle, kebab, dziadek, autobus, pies sąsiada). Tempo to „zaklęcie”, kilometry to „etapy próby”, podbiegi to „górskie demony”. Twórz własne, oryginalne żarty, nie cytuj filmów ani cudzych kwestii.

Dostajesz JSON z celem biegu i GOTOWYMI, policzonymi metrykami. Pole "spoken" zawiera te same liczby zapisane do przeczytania na głos.

Twarde zasady:
- NIE licz niczego sam i NIE wymyślaj liczb. Używaj wyłącznie liczb z metryk, a w polu "speech" przepisuj je dosłownie z pola "spoken" (np. „5 minut 20 sekund na kilometr”).
- Nigdy nie zapisuj czasu ani tempa w formie „5:20”, „5'20"” ani „/km” w polu "speech".
- Nigdy nie wypowiadaj angielskich kodów statusu (on_track, ahead, behind, at_risk, achieved) ani nazw pól z JSON-a (np. roznicaWzgledemPlanu, tempoNaNastepnyKm) — mów tylko ich WARTOŚCI.
- Stan biegacza opisz wartościami pól "spoken.status" i "spoken.roznicaWzgledemPlanu" (np. „jesteś 13 sekund za planem”).
- Numer kilometra mów słowami z "spoken.ktoryKilometr" (np. „trzeci kilometr”), nigdy „3 kilometr”.
- "speech": 2–3 krótkie zdania, maksymalnie 45 słów, po polsku, zwykły tekst bez emoji, markdown i cudzysłowów. Musi zawierać: który to kilometr, jak biegacz stoi względem celu oraz konkretne tempo na następny kilometr ("spoken.tempoNaNastepnyKm"), jeśli jest.
- Jeśli "spoken.status" mówi „za szybko” — każ zwolnić i nie palić zapasów.
- Jeśli "goalCompleted" jest true — świętuj albo pociesz, bez tempa na następny kilometr.
- "tip": jedna konkretna wskazówka techniczna lub taktyczna na kolejny kilometr, maksymalnie 12 słów, bez humoru, po polsku, liczby możesz zapisać krótko (np. 5:20/km).
- "previousSpeech" (jeśli jest) to Twoja poprzednia wypowiedź — nie powtarzaj tych samych żartów ani sformułowań.
- Pola liczbowe w odpowiedzi przepisz z metryk bez zmian.`;

const RESPONSE_SCHEMA = {
    name: 'run_coach_advice',
    strict: true,
    schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
            status: { type: 'string', enum: ['ahead', 'on_track', 'behind', 'at_risk', 'achieved'] },
            progressPercent: { type: 'number' },
            currentPaceSPerKm: { type: 'number' },
            targetPaceSPerKm: { type: ['number', 'null'] },
            nextKmTargetSplitS: { type: ['number', 'null'] },
            projectedFinishS: { type: ['number', 'null'] },
            deltaVsPlanS: { type: ['number', 'null'] },
            tip: { type: 'string' },
            speech: { type: 'string' },
        },
        required: [
            'status',
            'progressPercent',
            'currentPaceSPerKm',
            'targetPaceSPerKm',
            'nextKmTargetSplitS',
            'projectedFinishS',
            'deltaVsPlanS',
            'tip',
            'speech',
        ],
    },
};

/** The numbers always come from our own metrics, whatever the model echoed back. */
function adviceFromMetrics(metrics: CoachMetrics, tip: string, speech: string, fromModel: boolean): CoachAdvice {
    return {
        status: metrics.status,
        progressPercent: metrics.progressPercent,
        currentPaceSPerKm: metrics.lastKmPaceSPerKm,
        avgPaceSPerKm: metrics.avgPaceSPerKm,
        targetPaceSPerKm: metrics.targetPaceSPerKm,
        nextKmTargetSplitS: metrics.nextKmTargetPaceSPerKm,
        requiredPaceSPerKm: metrics.requiredPaceSPerKm,
        projectedFinishS: metrics.projectedFinishS,
        projectedDistanceKm: metrics.projectedDistanceKm,
        deltaVsPlanS: metrics.deltaVsPlanS,
        goalCompleted: metrics.goalCompleted,
        tip,
        speech,
        fromModel,
    };
}

function fallbackTip(metrics: CoachMetrics): string {
    if (metrics.goalCompleted) return 'Schłodź się spokojnym truchtem i rozciągnij.';
    if (metrics.status === 'ahead') return 'Odpuść trochę — oszczędzaj siły na końcówkę.';
    if (metrics.status === 'behind' || metrics.status === 'at_risk') return 'Skróć krok, podkręć kadencję i pracuj rękami.';
    return 'Trzymaj rytm i oddychaj spokojnie.';
}

export function fallbackAdvice(metrics: CoachMetrics): CoachAdvice {
    return adviceFromMetrics(metrics, fallbackTip(metrics), fallbackSpeech(metrics), false);
}

/** A small model sometimes reads a JSON key aloud ("roznicaWzgledemPlanu …"); drop any that slipped in. */
function stripFieldNames(speech: string, metrics: CoachMetrics): string {
    const keys = [...Object.keys(metrics.spoken), 'spoken', 'on_track', 'at_risk'];
    let cleaned = speech;
    for (const key of keys) cleaned = cleaned.replace(new RegExp(`\\b${key}\\b[:.]?`, 'g'), '');
    return cleaned.replace(/\s{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1').trim();
}

/**
 * Asks OpenRouter (openai/gpt-5.4-nano) for the spoken coaching line and a
 * tip for the next kilometre. Never throws: on any failure it returns the
 * deterministic fallback, so the runner still hears their numbers.
 */
export async function generateCoachAdvice(metrics: CoachMetrics, previousSpeech?: string): Promise<CoachAdvice> {
    const apiKey = process.env.OPEN_ROUTER_API_KEY;
    if (!apiKey) {
        console.error('[OpenRouter] Run coach: missing OPEN_ROUTER_API_KEY');
        return fallbackAdvice(metrics);
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: RUN_COACH_MODEL,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    {
                        role: 'user',
                        content: `Dane biegu (JSON):\n${JSON.stringify({ metrics, previousSpeech: previousSpeech || null }, null, 2)}`,
                    },
                ],
                response_format: { type: 'json_schema', json_schema: RESPONSE_SCHEMA },
                // The runner is waiting mid-stride; a quick answer beats a deliberated one.
                reasoning: { effort: 'low' },
                max_tokens: 1500,
            }),
            cache: 'no-store',
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`[OpenRouter] Run coach error: ${response.status} - ${text}`);
            return fallbackAdvice(metrics);
        }

        const data = await response.json();
        const content: string = data.choices?.[0]?.message?.content?.trim() || '';
        const parsed = JSON.parse(content) as { tip?: unknown; speech?: unknown };
        // The model likes to quote the phrases it copied; quotes mean nothing to TTS.
        const speech = typeof parsed.speech === 'string' ? parsed.speech.replace(/[„”“"«»]/g, '').trim() : '';
        const tip = typeof parsed.tip === 'string' ? parsed.tip.trim() : '';
        if (!speech) return fallbackAdvice(metrics);

        return adviceFromMetrics(metrics, tip || fallbackTip(metrics), stripFieldNames(speech, metrics).slice(0, 600), true);
    } catch (error) {
        console.error('[OpenRouter] Run coach failed:', error);
        return fallbackAdvice(metrics);
    }
}
