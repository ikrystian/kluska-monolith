/**
 * Text-to-speech through ElevenLabs, for the in-run AI coach.
 *
 * Env:
 * - ELEVENLABS_API_KEY  (required)
 * - ELEVENLABS_VOICE_ID (a voice that speaks Polish well — pick one in the
 *   ElevenLabs Voice Library; falls back to a premade multilingual voice)
 * - ELEVENLABS_MODEL_ID (optional, defaults to the low-latency Flash v2.5)
 */

/** Premade "George" voice — multilingual models make it speak Polish. */
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const DEFAULT_MODEL_ID = 'eleven_flash_v2_5';
/** Small mp3: plenty for speech over earbuds, quick to download mid-run. */
const OUTPUT_FORMAT = 'mp3_44100_64';
const REQUEST_TIMEOUT_MS = 15_000;

export function isElevenLabsConfigured(): boolean {
    return Boolean(process.env.ELEVENLABS_API_KEY);
}

/** Returns the spoken `text` as mp3 bytes. Throws on any failure. */
export async function synthesizeSpeech(text: string): Promise<Buffer> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        throw new Error('Missing ELEVENLABS_API_KEY in environment variables.');
    }
    const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
    const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID;

    const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${OUTPUT_FORMAT}`,
        {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
            },
            body: JSON.stringify({
                text,
                model_id: modelId,
                // Flash/Turbo v2.5 honour it; keeps short Polish lines from drifting into English.
                ...(modelId.includes('v2_5') ? { language_code: 'pl' } : {}),
                voice_settings: {
                    stability: 0.4,
                    similarity_boost: 0.75,
                    style: 0.35,
                    use_speaker_boost: true,
                },
            }),
            cache: 'no-store',
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        }
    );

    if (!response.ok) {
        const body = await response.text();
        console.error(`[ElevenLabs] TTS error: ${response.status} - ${body}`);
        throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
}
