import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { SpotifyAccount } from '@/models/SpotifyAccount';

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const account = await SpotifyAccount.findOne({ userId: user.id }).select('_id').lean();

        return NextResponse.json({ connected: !!account });
    } catch (error) {
        console.error('Error checking Spotify status:', error);
        return NextResponse.json({ error: 'Failed to check Spotify status' }, { status: 500 });
    }
}
