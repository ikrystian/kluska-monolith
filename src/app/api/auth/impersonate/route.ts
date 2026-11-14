import { NextRequest, NextResponse } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { signImpersonationToken } from '@/lib/jwt';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

/**
 * POST /api/auth/impersonate  { userId }
 *
 * Lets an admin sign in as another user. This route is the only place that
 * checks the caller's role; it answers with two signed tokens the client hands
 * to NextAuth's `signIn('credentials', { impersonationToken })`:
 *  - `token`        — valid for a minute, becomes the target user
 *  - `restoreToken` — brings the admin back to their own account afterwards
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // The role is read from the database, not the session: a demoted admin loses this at once.
    const admin = await User.findById(session.user.id).select('role').lean();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can impersonate users' }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId || !isValidObjectId(userId)) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const target = await User.findById(userId).select('name email role').lean();
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const adminId = String(session.user.id);
    return NextResponse.json({
      success: true,
      token: signImpersonationToken({ purpose: 'impersonate', sub: String(target._id), by: adminId }),
      restoreToken: signImpersonationToken({ purpose: 'restore', sub: adminId, by: adminId }),
      user: { id: String(target._id), email: target.email, name: target.name, role: target.role },
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
