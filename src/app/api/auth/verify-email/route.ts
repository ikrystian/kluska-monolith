import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { hashToken, markEmailVerified, sendWelcomeEmail } from '@/lib/account';

// POST (not GET) so mail scanners prefetching the link can't consume it.
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (typeof token !== 'string' || !token) {
      return NextResponse.json({ error: 'Brak tokenu aktywacyjnego.' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Link aktywacyjny jest nieprawidłowy, wygasł lub został już użyty.', code: 'INVALID_TOKEN' },
        { status: 400 }
      );
    }

    markEmailVerified(user);
    await user.save();
    await sendWelcomeEmail(user);

    return NextResponse.json({ message: 'Konto zostało aktywowane.', email: user.email });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: 'Wystąpił błąd wewnętrzny serwera.' }, { status: 500 });
  }
}
