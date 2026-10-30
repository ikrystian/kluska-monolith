import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { Gym } from '@/models';
import { createGymLogoResolver } from '@/lib/gym-logo';
import https from 'https';

interface SerperPlace {
    position: number;
    title: string;
    address: string;
    latitude: number;
    longitude: number;
    rating?: number;
    ratingCount?: number;
    category: string;
    phoneNumber?: string;
    website?: string;
    cid: string;
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { query, page = 1 } = body;

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const apiKey = 'd41aa0e966935ed3098658ac368672894a7f6e17'; // Hardcoded as requested

        const postData = JSON.stringify({
            q: query,
            location: 'Poland',
            gl: 'pl',
            hl: 'pl',
            page: parseInt(page as string) || 1
        });

        const options = {
            method: 'POST',
            hostname: 'google.serper.dev',
            path: '/places',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            maxRedirects: 20
        };

        const serperResponse = await new Promise<string>((resolve, reject) => {
            const req = https.request(options, (res) => {
                let chunks: Buffer[] = [];

                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });

                res.on("end", () => {
                    const body = Buffer.concat(chunks);
                    resolve(body.toString());
                });

                res.on("error", (error) => {
                    reject(error);
                });
            });

            req.write(postData);
            req.end();
        });

        const responseData = JSON.parse(serperResponse);

        if (!responseData.places || !Array.isArray(responseData.places)) {
            return NextResponse.json({ error: 'No places found or invalid API response', raw: responseData }, { status: 404 });
        }

        await connectToDatabase();

        const places: SerperPlace[] = responseData.places;
        const addedGyms = [];
        let duplicateCount = 0;
        let backfilledLogos = 0;

        // Serper nie zwraca logo — szukamy go na stronach siłowni. To najwolniejszy
        // krok, więc startuje równolegle dla wszystkich miejsc naraz.
        const resolveLogo = createGymLogoResolver();
        const logos = places.map(place => resolveLogo(place.website));

        for (const [index, place] of places.entries()) {
            // Check for duplicates: either by CID (if present) or by name + address match
            const query: any = {};
            const conditions = [];

            if (place.cid) {
                conditions.push({ cid: place.cid });
            }
            // Always include name+address backup check
            conditions.push({
                name: place.title,
                address: place.address
            });

            if (conditions.length > 0) {
                query.$or = conditions;
            } else {
                query.name = place.title;
                query.address = place.address;
            }

            const existing = await Gym.findOne(query);
            const logoUrl = await logos[index];

            if (!existing) {
                const newGym = new Gym({
                    name: place.title,
                    address: place.address,
                    location: {
                        lat: place.latitude,
                        lng: place.longitude
                    },
                    rating: place.rating,
                    ratingCount: place.ratingCount,
                    phoneNumber: place.phoneNumber,
                    website: place.website,
                    cid: place.cid,
                    logoUrl: logoUrl ?? undefined
                });
                await newGym.save();
                addedGyms.push(newGym);
            } else {
                duplicateCount++;
                // Siłownia zaimportowana, zanim zapisywaliśmy logo: uzupełniamy tylko to pole.
                if (!existing.logoUrl && logoUrl) {
                    existing.logoUrl = logoUrl;
                    await existing.save();
                    backfilledLogos++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            count: addedGyms.length,
            duplicatesSkipped: duplicateCount,
            totalFound: places.length,
            withLogo: addedGyms.filter(gym => gym.logoUrl).length,
            logosBackfilled: backfilledLogos,
            message:
                `Dodano ${addedGyms.length} nowych siłowni (z logo: ${addedGyms.filter(gym => gym.logoUrl).length}). ` +
                `Pominięto ${duplicateCount} duplikatów` +
                (backfilledLogos > 0 ? `, w ${backfilledLogos} z nich uzupełniono logo.` : '.')
        });

    } catch (error) {
        console.error('Import Gyms Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
