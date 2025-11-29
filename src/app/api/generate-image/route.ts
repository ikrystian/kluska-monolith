import { NextResponse } from 'next/server';

/**
 * POST /api/generate-image
 * Expects JSON body: { prompt: string }
 * Returns: { imageUrl: string }
 * Uses Gemini 2.5 Flash Image model for image generation
 */
export async function POST(request: Request) {
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Missing GOOGLE_AI_API_KEY' }, { status: 500 });
        }

        // Use Gemini 2.5 Flash Image model for image generation
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: `Generate a professional fitness exercise photo showing: ${prompt}. High quality, clear, well-lit gym setting.`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    responseModalities: ['TEXT', 'IMAGE'],
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', errorText);
            return NextResponse.json(
                { error: 'Failed to generate image', details: errorText },
                { status: 500 }
            );
        }

        const data = await response.json();

        // Extract image from response
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts;

        // Find the image part (inlineData)
        const imagePart = parts?.find((part: any) => part.inlineData);

        if (!imagePart?.inlineData) {
            console.error('No image in response:', JSON.stringify(data));
            return NextResponse.json(
                { error: 'No image returned from Gemini' },
                { status: 500 }
            );
        }

        // Return as data URL
        const { mimeType, data: base64Data } = imagePart.inlineData;
        const imageUrl = `data:${mimeType};base64,${base64Data}`;

        return NextResponse.json({ imageUrl });

    } catch (err) {
        console.error('generate-image error:', err);
        return NextResponse.json(
            { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
