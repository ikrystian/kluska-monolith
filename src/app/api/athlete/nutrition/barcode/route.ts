import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import CustomProduct from '@/models/CustomProduct';
import { searchFoodByBarcodeWithAI } from '@/lib/openrouter-food';
import { lookupBarcodeInOpenFoodFacts } from '@/lib/openfoodfacts';

/**
 * Scanners can return raw EAN/UPC digits, but QR codes on packaging often
 * carry a GS1 Digital Link URL (…/01/05901234123457/…) or other text —
 * extract the longest 8-14 digit run, which is the GTIN.
 */
function extractBarcode(raw: string): string | null {
    const runs = raw.match(/\d{8,14}/g);
    if (!runs) return null;
    return runs.sort((a, b) => b.length - a.length)[0];
}

/**
 * GET /api/athlete/nutrition/barcode?code=...
 * Resolves a scanned barcode/QR code to a product with nutrition per 100 g.
 * Order: local product cache → Open Food Facts → AI web search.
 * Every hit from an external source is persisted with the barcode, so the
 * next scan of the same product is instant.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rawCode = request.nextUrl.searchParams.get('code')?.trim();
        if (!rawCode) {
            return NextResponse.json({ error: 'Code parameter is required' }, { status: 400 });
        }

        const barcode = extractBarcode(rawCode);
        if (!barcode) {
            return NextResponse.json(
                { error: 'Zeskanowany kod nie zawiera kodu kreskowego produktu' },
                { status: 422 }
            );
        }

        await connectToDatabase();

        const cached = await CustomProduct.findOne({ barcode, source: 'ai' });
        if (cached) {
            return NextResponse.json({ product: cached, barcode, origin: 'local' });
        }

        const offResult = await lookupBarcodeInOpenFoodFacts(barcode);
        if (offResult) {
            const product = await CustomProduct.create({ ...offResult, barcode, source: 'ai' });
            return NextResponse.json({ product, barcode, origin: 'openfoodfacts' });
        }

        const aiResult = await searchFoodByBarcodeWithAI(barcode);
        if (!aiResult) {
            return NextResponse.json(
                { product: null, barcode, error: 'Nie znaleziono produktu dla tego kodu' },
                { status: 404 }
            );
        }

        const product = await CustomProduct.create({ ...aiResult, barcode, source: 'ai' });
        return NextResponse.json({ product, barcode, origin: 'ai' });
    } catch (error) {
        console.error('Error resolving barcode:', error);
        return NextResponse.json({ error: 'Failed to resolve barcode' }, { status: 500 });
    }
}
