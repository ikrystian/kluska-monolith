import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Gym } from '@/models/Gym';

export async function GET() {
    try {
        await connectToDatabase();
        const gyms = await Gym.find({});
        return NextResponse.json(gyms);
    } catch (error) {
        console.error('Error fetching gyms:', error);
        return NextResponse.json({ error: 'Failed to fetch gyms' }, { status: 500 });
    }
}
