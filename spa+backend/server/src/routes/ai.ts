
import express from 'express';

const router = express.Router();

/**
 * POST /api/ai/generate-image
 * Expects JSON body: { prompt: string }
 * Returns: { imageUrl: string }
 */
router.post('/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const apiKey = process.env.GEMINI_IMAGE_API_KEY;
        if (!apiKey) {
            console.error('Missing GEMINI_IMAGE_API_KEY');
            return res.status(500).json({ error: 'Server configuration error' });
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
            return res.status(response.status).json({
                error: 'Failed to generate image',
                details: errorText
            });
        }

        const data = await response.json();

        // Extract image from response
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts;

        // Find the image part (inlineData)
        const imagePart = parts?.find((part: any) => part.inlineData);

        if (!imagePart?.inlineData) {
            console.error('No image in response:', JSON.stringify(data));
            return res.status(500).json({ error: 'No image returned from Gemini' });
        }

        // Return as data URL
        const { mimeType, data: base64Data } = imagePart.inlineData;
        const imageUrl = `data:${mimeType};base64,${base64Data}`;

        res.json({ imageUrl });

    } catch (err) {
        console.error('generate-image error:', err);
        res.status(500).json({
            error: 'Internal server error',
            details: err instanceof Error ? err.message : 'Unknown error'
        });
    }
});

export default router;
