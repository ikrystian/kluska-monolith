import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { adminId } = await request.json();

    if (!adminId) {
      return NextResponse.json(
        { error: 'adminId is required' },
        { status: 400 }
      );
    }

    // Return success - the client will handle the session restoration
    return NextResponse.json({
      success: true,
      message: 'Admin session restored',
    });
  } catch (error) {
    console.error('Restore admin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
