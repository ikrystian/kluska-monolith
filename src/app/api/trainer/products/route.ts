import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/db';
import CustomProduct from '@/models/CustomProduct';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const body = await req.json();

        // Basic validation
        if (!body.name || body.calories === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newProduct = await CustomProduct.create({
            ...body,
            trainerId: session.user.id,
        });

        return NextResponse.json({ product: newProduct }, { status: 201 });
    } catch (error) {
        console.error('Error creating custom product:', error);
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('query');

        let filter: any = { trainerId: session.user.id };

        if (query) {
            // Case-insensitive regex search
            filter.name = { $regex: query, $options: 'i' };
        }

        const products = await CustomProduct.find(filter).sort({ createdAt: -1 }).limit(20);

        return NextResponse.json({ products });
    } catch (error) {
        console.error('Error fetching custom products:', error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}
