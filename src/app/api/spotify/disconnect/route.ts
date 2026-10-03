import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { SpotifyAccount } from '@/models/SpotifyAccount';

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        await SpotifyAccount.deleteOne({ userId: user.id });

        return NextResponse.json({
            success: true,
            message: 'Successfully disconnected Spotify account',
        });
    } catch (error) {
        console.error('Error disconnecting Spotify:', error);
        return NextResponse.json(
            { error: 'Failed to disconnect Spotify account' },
            { status: 500 }
        );
    }
}
