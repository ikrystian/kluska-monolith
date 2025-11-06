import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { signIn } from 'next-auth/react';

export async function POST(request: NextRequest) {
  try {
    // Verify that the current user is an admin
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Check if current user is admin
    const currentUser = await User.findById(session.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can impersonate users' },
        { status: 403 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get the target user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return the impersonation token data
    // The client will handle the actual session update via signIn
    return NextResponse.json({
      success: true,
      user: {
        id: targetUser._id.toString(),
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
      },
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
