import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { byteSize, sendSerialized, serializeJson } from '@/lib/http-cache';
import { cached, cacheKeys } from '@/lib/server-cache';
import { Gym } from '@/models/Gym';

/** The gym list is the same for everyone and only changes when an admin edits it. */
const GYMS_TTL_MS = 5 * 60_000;

export async function GET(request: NextRequest) {
    try {
        const gyms = await cached(
            cacheKeys.gyms,
            { ttlMs: GYMS_TTL_MS, sizeOf: byteSize },
            async () => {
                await connectToDatabase();
                return serializeJson(await Gym.find({}));
            }
        );
        return sendSerialized(request, gyms);
    } catch (error) {
        console.error('Error fetching gyms:', error);
        return NextResponse.json({ error: 'Failed to fetch gyms' }, { status: 500 });
    }
}
