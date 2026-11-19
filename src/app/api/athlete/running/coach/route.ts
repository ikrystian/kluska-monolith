import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestUser } from '@/lib/api-auth';
import { computeCoachMetrics } from '@/lib/run-coach-metrics';
import { generateCoachAdvice } from '@/lib/openrouter-run-coach';
import { isElevenLabsConfigured, synthesizeSpeech } from '@/lib/elevenlabs-tts';

const pace = z.number().min(150).max(900);

const goalSchema = z.discriminatedUnion('kind', [
    z.object({
        kind: z.literal('distance_time'),
        distanceKm: z.number().min(0.5).max(100),
        targetTimeS: z.number().min(60).max(86_400),
    }),
    z.object({
        kind: z.literal('steady_pace'),
        durationMin: z.number().min(5).max(600),
        targetPaceSPerKm: pace.nullable(),
    }),
    z.object({
        kind: z.literal('negative_split'),
        distanceKm: z.number().min(1).max(100),
        targetTimeS: z.number().min(60).max(86_400).nullable(),
    }),
    z.object({
        kind: z.literal('progressive'),
        distanceKm: z.number().min(1).max(100),
        startPaceSPerKm: pace,
        stepSPerKm: z.number().min(1).max(60),
    }),
]);

const bodySchema = z.object({
    goal: goalSchema,
    km: z.number().int().min(1).max(200),
    distanceM: z.number().min(0).max(300_000),
    movingTimeS: z.number().min(0).max(86_400),
    splits: z
        .array(
            z.object({
                km: z.number().int().min(1).max(200),
                timeS: z.number().min(0).max(7_200),
                elevationGainM: z.number().min(0).max(5_000).default(0),
            })
        )
        .max(200),
    previousSpeech: z.string().max(600).nullish(),
});

/**
 * One call per finished kilometre is the expected rate; anything much faster
 * is a client bug or abuse, and every call costs a model and a TTS request.
 */
const MIN_INTERVAL_MS = 20_000;
const lastCallAt = new Map<string, number>();

function throttled(userId: string): boolean {
    const now = Date.now();
    const last = lastCallAt.get(userId);
    if (last && now - last < MIN_INTERVAL_MS) return true;
    lastCallAt.set(userId, now);
    if (lastCallAt.size > 5_000) {
        for (const [id, at] of lastCallAt) if (now - at > 60 * 60 * 1000) lastCallAt.delete(id);
    }
    return false;
}

/**
 * POST /api/athlete/running/coach
 * Called by the run recorder (natively on Android, from the SPA elsewhere)
 * each time the athlete finishes a kilometre of a run with an advanced goal.
 * Computes exact progress numbers, has the model phrase them as a short
 * spoken cue, and voices it through ElevenLabs. Nothing is stored.
 *
 * Returns { km, coaching, speech, audio (base64 mp3 or null), mime }.
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const parsed = bodySchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid coach payload', issues: parsed.error.issues }, { status: 400 });
        }

        if (throttled(user.id)) {
            return NextResponse.json(
                { error: 'Too many coach requests' },
                { status: 429, headers: { 'Retry-After': String(MIN_INTERVAL_MS / 1000) } }
            );
        }

        const { goal, km, distanceM, movingTimeS, splits, previousSpeech } = parsed.data;
        const metrics = computeCoachMetrics({ goal, km, distanceM, movingTimeS, splits });
        const coaching = await generateCoachAdvice(metrics, previousSpeech ?? undefined);

        let audio: string | null = null;
        if (isElevenLabsConfigured()) {
            try {
                audio = (await synthesizeSpeech(coaching.speech)).toString('base64');
            } catch (error) {
                // The client still shows the advice and can fall back to on-device speech.
                console.error('Run coach TTS failed:', error);
            }
        }

        const { speech, ...rest } = coaching;
        return NextResponse.json({ km, coaching: rest, speech, audio, mime: 'audio/mpeg' });
    } catch (error) {
        console.error('Error generating run coaching:', error);
        return NextResponse.json({ error: 'Failed to generate run coaching' }, { status: 500 });
    }
}
