import { NextResponse } from 'next/server';

/**
 * POST /api/generate-image
 * Expects JSON body: { prompt: string }
 * Returns: { imageUrl: string }
 * Uses OpenRouter (google/gemini-2.5-flash-image) for image generation
 */
export async function POST(request: Request) {
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const apiKey = process.env.OPEN_ROUTER_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Missing OPEN_ROUTER_API_KEY' }, { status: 500 });
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "google/gemini-2.5-flash-image",
                provider: { require_parameters: true },
                modalities: ["image", "text"],
                messages: [
                    {
                        role: "user",
                        content: `Generate a professional fitness exercise photo showing: ${prompt}. High quality, clear, well-lit gym setting.`
                    }
                ],
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API error:', errorText);
            return NextResponse.json(
                { error: 'Failed to generate image', details: errorText },
                { status: 500 }
            );
        }

        const data = await response.json();
        console.log('OpenRouter Response Data:', JSON.stringify(data, null, 2));

        const message = data.choices?.[0]?.message;
        const content = message?.content;

        // Try to get image from message.images (Gemini specific on OpenRouter)
        let imageUrl = message?.images?.[0]?.image_url?.url;

        // Fallback: Try to extract from content markdown
        if (!imageUrl && content) {
            const urlMatch = content.match(/\!\[.*?\]\((.*?)\)/) || content.match(/(https?:\/\/[^\s)]+)/);
            if (urlMatch) {
                imageUrl = urlMatch[1];
            }
        }

        if (!imageUrl) {
            console.error('Could not extract image URL from response');
            return NextResponse.json({ error: 'Failed to extract image URL', response: data }, { status: 500 });
        }

        return NextResponse.json({ imageUrl });

    } catch (err) {
        console.error('generate-image error:', err);
        return NextResponse.json(
            { error: 'Internal server error', details: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
