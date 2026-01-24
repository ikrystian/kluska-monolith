import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const gymId = id;

        if (!gymId) {
            return NextResponse.json({ error: 'Gym ID is required' }, { status: 400 });
        }

        await connectToDatabase();

        // Find users who have the gymId in their favoriteGymIds array
        // Select only name and avatarUrl to minimize data transfer and privacy exposure
        const users = await User.find({
            favoriteGymIds: gymId,
        }).select('name avatarUrl');

        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching gym favorites:', error);
        return NextResponse.json(
            { error: 'Failed to fetch gym favorites' },
            { status: 500 }
        );
    }
}
